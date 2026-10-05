r"""Add Jel's recordings to the app.

Usage:  python process_jel.py [path\to\jel-recordings-XXXX.zip]
With no path it uses the newest jel-recordings-*.zip in your Downloads folder.
Converts each clip to a clean MP3 (silence trimmed, volume levelled), saves it to
audio/jel/, updates audio/jel/manifest.json, then commits and pushes to GitHub.
"""
import glob, json, os, subprocess, sys, tempfile, zipfile
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.abspath(__file__))
JEL = os.path.join(ROOT, "audio", "jel")
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
FILTER = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,"
          "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,areverse,"
          "loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=0.1")

def main():
    if len(sys.argv) > 1:
        zpath = sys.argv[1]
    else:
        found = sorted(glob.glob(os.path.join(os.path.expanduser("~"), "Downloads", "jel-recordings-*.zip")), key=os.path.getmtime)
        if not found: sys.exit("No jel-recordings-*.zip found in Downloads.")
        zpath = found[-1]
    print("Using", zpath)
    ids = {p["id"] for p in json.load(open(os.path.join(ROOT, "phrases.json"), encoding="utf-8"))["phrases"]}
    os.makedirs(JEL, exist_ok=True)
    mpath = os.path.join(JEL, "manifest.json")
    manifest = set(json.load(open(mpath))) if os.path.exists(mpath) else set()
    added = []
    with tempfile.TemporaryDirectory() as tmp, zipfile.ZipFile(zpath) as z:
        z.extractall(tmp)
        for f in sorted(os.listdir(tmp)):
            pid = os.path.splitext(f)[0]
            if pid not in ids: print("  skip", f); continue
            out = os.path.join(JEL, pid + ".mp3")
            r = subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", os.path.join(tmp, f), "-af", FILTER,
                                "-ac", "1", "-ar", "24000", "-b:a", "64k", out])
            if r.returncode == 0 and os.path.getsize(out) > 1500:
                manifest.add(pid); added.append(pid); print("  ok  ", pid)
            else:
                print("  FAILED", f)
    json.dump(sorted(manifest), open(mpath, "w"), indent=0)
    print(f"Added {len(added)} recordings ({len(manifest)} total).")
    if added:
        subprocess.run(["git", "add", "audio/jel"], cwd=ROOT, check=True)
        subprocess.run(["git", "commit", "-m", f"Add {len(added)} recordings from Jel"], cwd=ROOT, check=True)
        subprocess.run(["git", "push"], cwd=ROOT, check=True)
        print("Pushed. The app picks them up within a minute or two.")

if __name__ == "__main__":
    main()
