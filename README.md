## Reverse OCR Bot

Here's how this works:

* We have an [OCR library](http://antimatter15.com/ocrad.js/demo.html) that attempts to parse text out of images. Specifically it works best with black text on white backgrounds.
* We pick a dictionary word 8 characters or fewer as our target, using [the Wordnik API](http://developer.wordnik.com/docs).
* We get the first letter of the word and we draw random glyphs until the OCR library recognizes the glyph as that letter.
  * A glyph is drawn like so: we start in the middle of a 100x200 canvas and draw 20 lines to random points ~40 pixels in a random direction. It's like putting your pen down and drawing 20 lines before picking it back up.
* When we get a hit on the letter, we stop trying for that letter and move on to the next letter.
* If we fail to generate a letter, we generate a space in its place.
* When we're done we stitch it all together into an 800x200 image.
* Post to Twitter and Tumblr.

This bot is scheduled to run on a cron job, so when `index.js` is run, it does this exactly once on its own.

## License
Copyright (c) 2014 Darius Kazemi  
Licensed under the MIT license.
