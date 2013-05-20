//this function gets called by the queue after the data is loaded
//parameters: error, results that come from queue, and a callback function
function preprocessing(error, results){



  //separate the results array
  dataset = results[0];
  pubdata = results[1];
  science_data = results[2];

  //go through the dataset and extract data for variables
  for (entry in dataset){
    departments.push(dataset[entry].Department);
    names.push(dataset[entry].Name);
    ranks.push(dataset[entry].Rank);
    contractTypes.push(dataset[entry].Contract);
  }

  //go through the pub data and extract data for variables
  for (entry in pubdata){
    years.push(pubdata[entry].Year);
  }

  //remove duplicates
  departmentsUnique = eliminateDuplicates(departments);
  namesUnique = eliminateDuplicates(names);
  ranksUnique = eliminateDuplicates(ranks);
  contractTypesUnique = eliminateDuplicates(contractTypes);
  yearsUnique = eliminateDuplicates(years);

  //get rid of some unwanted entries
  yearsUnique = _.reject(yearsUnique, function(year){ return year == "" || year == "Year"; });


  //e.g., getDeptCenters(9, circleOutline[0][0].r.animVal.value, circleOutline[0][0].cx.animVal.value, circleOutline[0][0].cy.animVal.value)
  // function getDeptCenters() {
      var numpoints = departmentsUnique.length;
      var radius = circleOutline[0][0].r.animVal.value;
      var centerx = circleOutline[0][0].cx.animVal.value;
      var centery = circleOutline[0][0].cy.animVal.value;
      var slice = 2 * Math.PI / numpoints;
      for (i = 0; i < numpoints; i++)
      {
          var angle = slice * i;
          var newX = (centerx + radius * Math.cos(angle));
          var newY = (centery + radius * Math.sin(angle));
          //arbitrarily assign each department to a coordinate location that has just been calculated
          deptCircles.push([departmentsUnique[i], newX, newY]);
          // networksvg.append("svg:circle").attr("class", "deptCircle").attr("cx", newX).attr("cy", newY).attr("r", 25);
      }
  // }

  department_centers = [
   {name: "Applied Mathematics", x: 10, y: 200}, 
   {name: "Chemistry", x:300, y:50}, 
   {name: "Computer Science", x:500, y:50}, 
   {name: "Biology", x:700, y:50}, 
   {name: "Earth Sciences", x:$('#networkviz').width() - 10, y:200}, 
   {name: "Mathematics", x:10, y:800}, 
   {name: "Physics and Astronomy", x: 300, y:800}, 
   {name: "Science - Office of the Dean", x:500, y:800}, 
   {name: "Statistics & Actuarial Science", x:$('#networkviz').height() - 10, y:800}
  ];

  //create object and initialize property
  departmentsUnique.forEach(function (d) {
    departmentCounts[d] = 0;
  })

  departments.forEach(function (d) {
    departmentCounts[d] += 1;
  })

  ranksUnique.forEach(function (d) {
    rankCounts[d] = 0;
  })

  ranks.forEach(function (d) {
    rankCounts[d] += 1;
  }) 

  contractTypesUnique.forEach(function (d) {
    contractTypesCounts[d] = 0;
  })

  contractTypes.forEach(function (d) {
    contractTypesCounts[d] += 1;
  })

  departmentsMax = getHighestCount(departmentCounts);
  ranksMax = getHighestCount(rankCounts);
  genderMax = Math.max(males, females);
  contractMax = getHighestCount(contractTypesCounts);

  //gets all of the counts and puts them in a 1D array
  for (var key in departmentCounts) {
    if (departmentCounts.hasOwnProperty(key)) {
      dcounts.push(departmentCounts[key]);   
    }
  }
  for (var key in rankCounts) {
    if (rankCounts.hasOwnProperty(key)) {
      rcounts.push(rankCounts[key]);   
    }
  }
  for (var key in contractTypesCounts) {
    if (contractTypesCounts.hasOwnProperty(key)) {
      ctcounts.push(contractTypesCounts[key]);   
    }
  }

  for (entry in science_data) {
    science_faculty_members.push(science_data[entry].Name);
  }
  
  science_faculty_members_unique = eliminateDuplicates(science_faculty_members);

  rows: //label
  for (row_num in pubdata) {
    authors = pubdata[row_num].Authors;
    autharr = authors.split("; "); //make sure to include the space

    authors: //label
    for (author_num in autharr){
      var surname = autharr[author_num].substring(0, autharr[author_num].indexOf(' ') + 2); //surname and first initial

      members: //label
      for (i in science_faculty_members_unique){
        //extract the surname and the first initial
        //e.g., "Lastname,Firstname MiddleInitial" will become "Lastname FirstInitial"
        var surname2 = science_faculty_members_unique[i].substring(0,science_faculty_members_unique[i].indexOf(',')) + " " + science_faculty_members_unique[i].substring(science_faculty_members_unique[i].indexOf(',') + 1, science_faculty_members_unique[i].indexOf(',') + 2); 

        //extract surname only
        //var surname2 = science_faculty_members_unique[i].substring(0,science_faculty_members_unique[i].indexOf(','));
        
        if (surname == surname2){ //we have a match
          //add the whole row to a new array that keeps track of the pubs with an author from science faculty
          pubs_science.push(pubdata[row_num]);
        }
      } //end members   
    } //end authors
  } //end rows

  //removes the undefined elements in the array
  pubdata_filtered = pubdata.filter(function(val) {
    return !(typeof val == "undefined");
  });

  //construct the "links" array to be used in the networkviz.
  //goes through pubs_science that was constructed above
  for(row_num2 in pubs_science){
    authors2 = pubs_science[row_num2].Authors;
    autharr2 = authors2.split("; ");
    pubyear = parseInt(pubs_science[row_num2].Year);

    for (author_num2 in autharr2){
      var source = autharr2[author_num2].substring(0, autharr2[author_num2].indexOf(' ') + 2);

      if (source != autharr2[autharr2.length-1].substring(0, autharr2[author_num2].indexOf(' ') + 2)) { //if source is not the last one in the array

        var counter = 1;//use to keep track of the target index
        do {
          var ind = parseInt(author_num2) + counter;
          var target = autharr2[ind].substring(0, autharr2[ind].indexOf(' ') + 2);
          ////check for duplicates////
          //var instances = 0;
          //check if already exists...instances += numDuplicates;
          links_science.push({"source":source, "target":target, "value":0, "year":pubyear});

          counter += 1;
        } while ((target != autharr2[autharr2.length-1].substring(0, autharr2[author_num2].indexOf(' ') + 2)) && ((counter + author_num2) < autharr2.length)); //while target is not the last element and we don't go out of bounds
      } // end if

      //base case:one author...don't need to add it

    }//end inner for  
  }//end outer for

  //need to convert the links_science array so that the source and target refer to elements in the science_data array rather than to names...this is how d3 needs it
  for (link in links_science){
    //go through the faculty list
    for (element in science_data){
      //checks if the source and target are the same as a faculty member...name has to be normalized first so it is "Lastname Firstinitial" so that they can be compared
      if (links_science[link].source == (science_data[element].Name.substring(0,science_data[element].Name.indexOf(',')) + " " + science_data[element].Name.substring(science_data[element].Name.indexOf(',')+1,science_data[element].Name.indexOf(',')+2))) {
          //set the source to be the index of the element ("element" in this case)
          links_science[link].source = parseInt(element);
      }
      if (links_science[link].target == (science_data[element].Name.substring(0,science_data[element].Name.indexOf(',')) + " " + science_data[element].Name.substring(science_data[element].Name.indexOf(',')+1,science_data[element].Name.indexOf(',')+2))) {
        //set the target to be the index of the element ("element" in this case)
        links_science[link].target = parseInt(element);
        }
    }//end inner for
  }//end outer for

  //remove all links that are not between authors within science at western--i.e., remove all outside/non-faculty links--and store in links_science_exclusive
  links_science_exclusive = _.filter(links_science, function(n) { return _.isNumber(n.source) && _.isNumber(n.target); });
  links_for_network = _.filter(links_science, function(n) { return _.isNumber(n.source) && _.isNumber(n.target); });

  links_science_exclusive_unique = getUniqueLinks(links_science_exclusive);
  links_for_network = getUniqueLinks(links_science_exclusive); 
    // }
  //} 


    //if the user wants to see the matrix
  // d3.select("#translate").on("change", function() {
  //   // clearTimeout(timeout);
  //   console.log("in ");
  //   if (this.value === "matrix")
  //     constructMatrix;
  // }); DELETE THIS??

  //build the network visualization
  //network();
  //constructMatrix();

  //go through links_science and combine duplicates and increase the 'value'
  //for example, if there are two objects with source=john and target=jack, they should be combined into one object that has a value of 2
  //reverse connections are considered the same--i.e., source=jack and target=john would also increase the value of the aforementioned object
  // for (link in links_science_exclusive){
  //   var sourcename = links_science_exclusive[link].source.Name;
  //   var targetname = links_science_exclusive[link].target.Name;
  //   for (i=parseInt(link)+1; i<links_science_exclusive.length; i++){
  //     //if there is a match
  //     if ((sourcename === links_science_exclusive[i].source.Name && targetname === links_science_exclusive[i].target.Name) || (sourcename === links_science_exclusive[i].target.Name && targetname === links_science_exclusive[i].source.Name){
  //       links_science_exclusive[link].value += 1;
  //     }

  //   }
  // }
  end = links_science_exclusive_unique[0];  

  //close the colorbox
  //a new one is loaded after this (see publications_map)
  $.colorbox.close();

  //populate the autocomplete search box with the science members
      $( "#tags" ).autocomplete({
      source: science_faculty_members_unique,
      delay: 500,
      minLength: 2,
      select: function (event, ui) {
        var name = ui.item.value;
        highlightSelectedNode(name);
      }
    });

}//end preprocessing