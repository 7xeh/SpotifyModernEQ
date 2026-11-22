# How It Works

## Six real filters, eleven controls

Spotify's audio engine has exactly six equalizer filters compiled into the native binary:

- lowshelf @ 60 Hz
- peaking @ 150 Hz
- peaking @ 400 Hz
- peaking @ 1000 Hz
- peaking @ 2400 Hz
- highshelf @ 15000 Hz

No extension can add real DSP bands. Modern EQ gives you an 11-band control surface (32 Hz – 24 KHz) and solves for the six native gains that best reproduce your target.

## The fit

Each native filter is modeled as an RBJ biquad. Modern EQ builds a basis from each filter's magnitude response at the 11 band frequencies, then solves a ridge-regularized least-squares system (`fitToNative` in `src/utils/dsp.ts`) that maps your 11-band target onto the six real gains, clamped to ±12 dB. Only filters whose gain actually changed are written, in parallel, through `Spicetify.Platform.EqualizerAPI.setFilterGain`.

## The two curves

The panel draws both:

- The **accent curve** is your 11-band target.
- The **white curve** is the true magnitude response of the six-filter fit — exactly what the engine applies.

Where the two diverge, you are seeing the limit of six filters reproducing an eleven-point target. Nothing is hidden: the native filter readout under the graph lists the six gains in dB.

## Two-way sync

The stock equalizer page and the Modern EQ panel never disagree:

- Opening the panel reads the live native state and, if it drifted, back-solves your 11 bands from the applied response.
- Pref subscriptions watch for external changes (someone dragging the stock sliders) and refresh the panel.
- When Modern EQ writes gains, it mirrors them into the stock sliders so the stock page's stale state can never overwrite yours.
