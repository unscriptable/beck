#!/usr/bin/env bash

fldr=$(pwd)
cat "$fldr/../src/_header.txt" "$fldr/../src/load.js" "$fldr/../src/fetchText.js" "$fldr/../src/object.js" "$fldr/../src/path.js" "$fldr/../src/promise.js" "$fldr/../src/Pipeline.js" "$fldr/../src/LoaderImpl.js" > "$fldr/../load.js"