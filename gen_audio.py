# Generates starter audio for every phrase with Microsoft neural voices (edge-tts).
# Usage: python gen_audio.py   (skips files that already exist)
import asyncio, json, os, re
import edge_tts
ROOT = os.path.dirname(os.path.abspath(__file__))
TL_VOICE, EN_VOICE = "fil-PH-BlessicaNeural", "en-GB-SoniaNeural"
async def make(text, voice, path, rate="-10%"):
    if os.path.exists(path) and os.path.getsize(path) > 0: return
    for attempt in range(4):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(path); return
        except Exception as e:
            print("retry", path, e); await asyncio.sleep(2)
async def main():
    data = json.load(open(os.path.join(ROOT, "phrases.json"), encoding="utf-8"))
    os.makedirs(os.path.join(ROOT, "audio", "tl"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "audio", "en"), exist_ok=True)
    sem = asyncio.Semaphore(6)
    async def one(p):
        async with sem:
            await make(p["tl"], TL_VOICE, os.path.join(ROOT, "audio", "tl", p["id"] + ".mp3"))
            en = re.sub(r"[()]", "", p["en"]).replace(" / ", ", or ")
            await make(en, EN_VOICE, os.path.join(ROOT, "audio", "en", p["id"] + ".mp3"), rate="+0%")
    await asyncio.gather(*(one(p) for p in data["phrases"]))
    print("done", len(data["phrases"]))
asyncio.run(main())
