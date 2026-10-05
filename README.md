# Salita

Spoken Tagalog for Nik, a few minutes at a time. A home-screen web app hosted on GitHub Pages.

- **Today**: what to do next, streak, tonight's mission phrase
- **Learn**: 5 new phrases a day with audio, slow playback and record-yourself
- **Walk**: a 15-minute hands-free audio drill that keeps playing with the screen locked
- **Review**: spaced-repetition flashcards
- **Phrases**: searchable phrasebook, favourites, add your own

`record.html` is Jel's recording page. She records each phrase and taps **Send to Nik**, which shares a zip.

## Adding Jel's recordings
Save the zip to Downloads, then in this folder run:

    python process_jel.py

It cleans up each clip, saves it to `audio/jel/`, and pushes. The app switches to her voice for those phrases.

## Files
- `phrases.json`: course content (weeks 1–4)
- `audio/tl`, `audio/en`: starter neural-voice audio (`gen_audio.py` regenerates it)
- `audio/jel`: Jel's recordings + `manifest.json`
