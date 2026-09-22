"""Almaty, 22.01.2024 18:09 UTC (23.01 00:09 local) — real ground motion from station KZ.KNDC.

Downloads raw miniSEED + StationXML from the EarthScope/IRIS FDSN services, checks that the
STS-2 did not clip, removes the instrument response to get acceleration, and writes
public/records/almaty-2024-kndc.json. Nothing is synthesised: if the data are clipped or
missing the script stops with an error.

Run: python scripts/fetch_almaty_2024.py   (needs `pip install obspy`)
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from obspy import UTCDateTime
from obspy.clients.fdsn import Client
from obspy.geodetics import gps2dist_azimuth

OUT = Path(__file__).resolve().parent.parent / "public" / "records" / "almaty-2024-kndc.json"
DIGITIZER_LIMIT = 2**23  # 24-bit digitizer
G = 9.81

usgs = Client("USGS")
ev = usgs.get_events(starttime=UTCDateTime("2024-01-22T18:00:00"), endtime=UTCDateTime("2024-01-22T18:30:00"),
                     minmagnitude=6.5)[0]
origin, mag = ev.preferred_origin() or ev.origins[0], ev.preferred_magnitude() or ev.magnitudes[0]
print(f"event: {origin.time} {origin.latitude:.3f}N {origin.longitude:.3f}E M{mag.mag} ({mag.magnitude_type})")

iris = Client("EARTHSCOPE")
t0, t1 = origin.time - 30, origin.time + 330
inv = iris.get_stations(network="KZ", station="KNDC", channel="BH?", level="response", starttime=t0, endtime=t1)
st = iris.get_waveforms("KZ", "KNDC", "*", "BHN,BHE", t0 - 60, t1 + 60)
st.merge(fill_value=None)
sta = inv[0][0]
dist_km = gps2dist_azimuth(sta.latitude, sta.longitude, origin.latitude, origin.longitude)[0] / 1000
print(f"epicentral distance {dist_km:.0f} km")

records = {}
for tr in st:
    if np.ma.isMaskedArray(tr.data):
        sys.exit(f"{tr.id}: gaps in the data — refusing to interpolate")
    raw = tr.data.astype(np.int64)
    peak_counts = int(np.abs(raw).max())
    flat = int(np.max(np.diff(np.flatnonzero(np.diff(raw) != 0), prepend=0))) if len(raw) > 2 else 0
    print(f"{tr.id}: max |counts| {peak_counts} of {DIGITIZER_LIMIT}, longest flat run {flat} samples")
    if peak_counts >= 0.98 * DIGITIZER_LIMIT:
        sys.exit(f"{tr.id} is clipped — cannot be used")
    tr.detrend("demean").detrend("linear").taper(0.05)
    nyq = tr.stats.sampling_rate / 2
    tr.remove_response(inventory=inv, output="ACC", pre_filt=[0.05, 0.1, 0.8 * nyq, 0.9 * nyq])
    tr.trim(t0, t1)
    acc_g = tr.data / G
    records[tr.stats.channel] = (tr, acc_g)
    print(f"{tr.id}: PGA {np.abs(acc_g).max():.5f} g, dt {tr.stats.delta}, {tr.stats.npts} samples")

ch, (tr, acc_g) = max(records.items(), key=lambda kv: np.abs(kv[1][1]).max())
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps({
    "id": "almaty-2024-kndc",
    "name": "Алматы, 23.01.2024",
    "dt": tr.stats.delta,
    "accelG": [float(f"{v:.6g}") for v in acc_g],
    "peakG": float(f"{np.abs(acc_g).max():.6g}"),
    "source": f"EarthScope/IRIS FDSN dataselect + station (level=response), KZ.KNDC..{ch}, "
              f"{t0.isoformat()}–{t1.isoformat()} UTC; instrument response removed with ObsPy (output=ACC)",
    "citation": f"Network KZ (Kazakhstan National Data Center), DOI 10.7914/SN/KZ; station KNDC "
                f"{sta.latitude:.4f}N {sta.longitude:.4f}E, STS-2. Event: {origin.time.isoformat()} UTC, "
                f"{origin.latitude:.2f}N {origin.longitude:.2f}E, M{mag.mag} {mag.magnitude_type} (USGS event {re.search(r'eventid=([^&]+)', ev.resource_id.id).group(1)})",
    "note": "Broadband velocity sensor, differentiated via full response removal; stronger horizontal "
            f"component ({ch}); pre-filter 0.05–0.1 Hz / {0.8 * nyq:.0f}–{0.9 * nyq:.0f} Hz. "
            f"Real recording {dist_km:.0f} km from the epicentre, shape of shaking only — the app scales it to the chosen intensity.",
}, ensure_ascii=False), encoding="utf-8")
print(f"wrote {OUT} ({ch})")
