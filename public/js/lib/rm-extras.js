/*
extra functions for use with researchmap
putting them here means they don't have to be repeated in individual modules

Copyright (c) 2013 Paul Parsons

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE 
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, 
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

rm = function() {

	var rm = {};

	//similar to _.extend, but with the added feature of maintaining different properties (rather than overwriting them)
	//if properties are the same they will be merged/overwritten (same as with _.extend)
	//if properties are not the same, they will be combined in the form of an array and stored as multiple properties
	//@params: obj: objects to combine
	//@returns: obj: the combine object
	rm.combineObjects = function (obj) {
	  var slice = Array.prototype.slice;
	  var concat = Array.prototype.concat;
	  
	    _.each(obj.slice(1), function(source) {
	      
	      if (source) {
	        for (var prop in source) {
	          //if they properties are the same overwrite
	          if (obj[0][prop] === source[prop]) {
	              obj[0][prop] = source[prop];
	            }
	            else {
	              //concatenate the properties
	              //if the property is already an array
	              if (obj[0][prop].constructor === Array){
	                obj[0][prop] = obj[0][prop].concat(source[prop]); //concatenate
	              }
	              //if it is not already an array
	              else {
	                obj[0][prop] = [obj[0][prop]].concat(source[prop]); //turn it into an array and then concatenate
	              }
	            }
	        }
	      }
	    });
	    return obj[0];
	  };

	  return rm;
}();