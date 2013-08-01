// Produce an array that contains a join of the passed-in arrays.
// Last argument is a comparator function to compare keys
_.mixin({
    join: function () {
        var cmp = arguments[arguments.length - 1];
        var join = [];
        _.each(arguments, function (array) {
            if (_.isFunction(array)) return;
            _.each(array, function (newObj) {
                var isMerged = false;
                _.each(join, function (joinObj, joinIndex) {
                    if (cmp(newObj, joinObj)) {
                        _.each(newObj, function (value, key) {
                            joinObj[key] = value;
                        });
                        join[joinIndex] = joinObj;
                        isMerged = true;
                    }
                });
                if (!isMerged) {
                    join.push(newObj);
                }
            });
        });
        return join;
    }
});


//from https://gist.github.com/furf/3208381
_.mixin({

  // Get/set the value of a nested property
  deep: function (obj, key, value) {

    var keys = key.replace(/\[(["']?)([^\1]+?)\1?\]/g, '.$2').replace(/^\./, '').split('.'),
        root,
        i = 0,
        n = keys.length;

    // Set deep value
    if (arguments.length > 2) {

      root = obj;
      n--;

      while (i < n) {
        key = keys[i++];
        obj = obj[key] = _.isObject(obj[key]) ? obj[key] : {};
      }

      obj[keys[i]] = value;

      value = root;

    // Get deep value
    } else {
      while ((obj = obj[keys[i++]]) != null && i < n) {};
      value = i < n ? void 0 : obj;
    }

    return value;
  };

  //pluck nested properties
  pluckDeep: function (obj, key) {
    return _.map(obj, function (value) { return _.deep(value, key); });
  }  

});