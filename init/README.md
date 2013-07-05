# Shim files

These files are used by beck to create a minimal loader.  Since no loader
exists before they are needed, they have a custom pseudo-module format
that doesn't require custom globals.  It uses the standard ES6 globals,
which have been minimally shimmed while the fully-shimmed loader is
being constructed.
