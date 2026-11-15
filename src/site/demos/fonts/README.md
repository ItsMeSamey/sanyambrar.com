# Reverb Android font candidates

These unmodified TrueType files were copied from the local Android SDK Platform
29 `data/fonts` directory. They are candidate assets for the Reverb web demo.
They are **not verified copies of the current installed phone's fonts**. Do not
claim pixel parity from these files alone; compare device font configuration
and font-file hashes before treating them as the installed source.

The Roboto files identify themselves as version 2.138 (2017), with SDK family
names `Roboto21382017` and `Roboto Medium21382017`. Droid Sans Mono identifies
itself as version 1.00 build 113, family `Droid Sans Mono100build113`.

All four files contain an Apache License 2.0 declaration in their name table.
`LICENSE.txt` contains the corresponding Apache 2.0 notice from the SDK's
`data/NOTICE.txt`. Copyright declarations embedded in the files are:

- Roboto: Copyright 2011 Google Inc. All Rights Reserved.
- Droid Sans Mono: Digitized data copyright (c) 2007, Google Corporation.

`provenance.json` records the source directory, unmodified file hashes, and raw
TrueType vertical metrics. Font-table metrics are evidence about these assets;
they do not by themselves prove Android Paint's final hinted glyph metrics.

Only regular 400, medium 500, and bold 700 Roboto assets are included. There is
no exact 600 face or variable font here. Droid Sans Mono supplies regular 400.
Use explicit web font family aliases; the SDK family names are not browser
fallback names. Review synthetic/interpolated weights against device captures.
