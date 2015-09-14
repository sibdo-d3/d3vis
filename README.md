### SibD3

A series of visualisation components based on the d3 library.

Includes a pliable mesh visualisation in torus or lattice topologies.


#### Instructions

To add the pliable mesh visualisation into your web-page, include the d3vis.js script, and the latest d3 library. The mesh visualisation can then be constructed as follows:
```javascript
var svg = d3.select("body").append("svg")
	.attr("width", 600)
	.attr("height", 500);
var meshVis = D3Vis.Mesh();
meshVis(svg);
```
See [test_page.html](https://raw.githubusercontent.com/Cride5/d3vis/master/test_page.html) for a more detailed example.




**License:** [GNU Public License Version 3](http://www.gnu.org/licenses/)


**Author:** [Conrad Rider](http://www.crider.co.uk)

