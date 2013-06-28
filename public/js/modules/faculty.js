var FACULTY = (function () { 


  var departments = {{{lists}}}.departments;

  var margin = {top: 0, right: 0, bottom: 10, left: 180},
      width = 350,
      height = 250,
      piewidth = 300,
      pieheight = 310,
      x = d3.scale.linear(),
      y = d3.scale.ordinal().rangeRoundBands([0,height], .05),
      radius = Math.min(piewidth, pieheight) / 2;

  var dataset;
  var departments = [];
  var names = [];
  var ranks = [];
  var contractTypes = [];
  var namesUnique = [];
  var departmentsUnique = [];
  var ranksUnique = [];
  var contractTypesUnique = [];
  var departmentCounts = new Object();
  var rankCounts = new Object();
  var contractTypesCounts = new Object();
  var departmentsHighestCount;
  var dcounts = []; //1D array for the department counts
  var rcounts = []; //1D array for the rank counts
  var ctcounts = [];
  var males = 0;
  var females = 0;
  var genderDistribution = new Object();


  d3.csv("data/faculty.csv", function(data) {
    
    dataset = data;//to avoid confusion of names

    
    for (entry in dataset){
      departments.push(dataset[entry].Department);
      names.push(dataset[entry].Name);
      ranks.push(dataset[entry].Rank);
      contractTypes.push(dataset[entry].Contract)
    }

    //remove duplicates
    departmentsUnique = eliminateDuplicates(departments);
    namesUnique = eliminateDuplicates(names);
    ranksUnique = eliminateDuplicates(ranks);
    contractTypesUnique = eliminateDuplicates(contractTypes);

    //get the gender distribution
    dataset.forEach(function (d) {
      if (d.Sex == "Male")
        males += 1;
      else
        females += 1;
    })

    //populate the genderDistribution object
    genderDistribution.MaleCount = males;
    genderDistribution.FemaleCount = females;


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

    //display some stats
    d3.select("#overviewbanner").append("p").style("font-size", "15px").style("display", "inline-block").text("faculty members");
    d3.select("#overviewbanner").append("p").style("font-size", "30px").style("display", "inline-block").style("padding-left", "20px").text(namesUnique.length);
    d3.select("#overviewbanner").append("p").style("font-size", "15px").style("display", "inline-block").style("padding-left", "40px").text("departments");
    d3.select("#overviewbanner").append("p").style("font-size", "30px").style("font-weight", "200").style("display", "inline-block").style("padding-left", "20px").text(departmentsUnique.length);
    
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //+++++++++++++++++++++++++++++++++++++++++++ Department Distribution Chart +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    
    //create SVG area for the chart
    var departmentCountsChart = d3.select("#distribution").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); // padding for the labels

    //set up a scale for the chart
      x.domain([0,departmentsMax]).range([0,300]);
      ///y.domain(dataset.map(function (d) { return d.Department }));???

    departmentCountsChart.selectAll(".bar")
        .data(dcounts)
      .enter().append("rect")
        
        .attr("class", "bar")
        
        .attr("height", 20)
        
        .attr("y", function (d, i) { return i * 25; })
        .transition().delay(1000).duration(2000)
        .attr("width", x);

    //put labels on the bars
    departmentCountsChart.selectAll(".countLabel")
        .data(dcounts)
      .enter().append("text")
        
        .attr("x", x)
        .attr("y", function (d, i) { return i * 25 + 10; })
        .attr("dx", -2)
        .attr("dy" ,".35em")
        .attr("font-family", "Helvetica Neue")
        .attr("fill", "white")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .transition().delay(2000)
        .text(String);

    //put labels on the axis
    departmentCountsChart.selectAll(".departmentLabel")
      .data(departmentsUnique)
      .enter().append("text")
        
        .attr("x", 0)

        .attr("y", function (d, i) { return i * 25 + 10; })
        .transition().duration(1000)
        .attr("dx", -margin.left)
        .attr("dy" ,".35em")
        .attr("font-family", "Helvetica Neue")
        .attr("fill", "black")
        .attr("font-size", 10)
        .attr("text-anchor", "start")
        .text(String);

    //+++++++++++++++++++++++++++++++++++++++++++ End Department Distribution Chart +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //+++++++++++++++++++++++++++++++++++++++++++ Ranks Distribution Chart +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    
    //create SVG area for the chart
    var ranksChart = d3.select("#ranks").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); // padding for the labels

    //set up a scale for the chart
      x.domain([0,ranksMax]).range([0,300]);
      ///y.domain(dataset.map(function (d) { return d.Department }));???

    ranksChart.selectAll(".bar")
        .data(rcounts)
      .enter().append("rect")
        
        .attr("class", "bar")
        
        .attr("height", 20)
        
        .attr("y", function (d, i) { return i * 25; })
        .transition().delay(1000).duration(2000)
        .attr("width", x);

    //put labels on the bars
    ranksChart.selectAll(".rcountLabel")
        .data(rcounts)
      .enter().append("text")
        
        .attr("x", x)
        .attr("y", function (d, i) { return i * 25 + 10; })
        .attr("dx", -2)
        .attr("dy" ,".35em")
        .attr("font-family", "Helvetica Neue")
        .attr("fill", "white")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .transition().delay(2000)
        .text(String);

    //put labels on the axis
    ranksChart.selectAll(".rankLabel")
      .data(ranksUnique)
      .enter().append("text")
        
        .attr("x", 0)

        .attr("y", function (d, i) { return i * 25 + 10; })
        .transition().duration(1000)
        .attr("dx", -margin.left)
        .attr("dy" ,".35em")
        .attr("font-family", "Helvetica Neue")
        .attr("fill", "black")
        .attr("font-size", 10)
        .attr("text-anchor", "start")
        .text(String);

    //+++++++++++++++++++++++++++++++++++++++++++ End Ranks Distribution Chart +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //+++++++++++++++++++++++++++++++++++++++++++ gender Distribution Chart +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    
    //create SVG area for the chart
    var genderChart = d3.select("#gender").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); // padding for the labels

    //set up a scale for the chart
      x.domain([0,genderMax]).range([0,300]);
      ///y.domain(dataset.map(function (d) { return d.Department }));???

    genderChart.selectAll(".bar")
        .data([males, females])
      .enter().append("rect")
        
        .attr("class", "bar")
        
        .attr("height", 20)
        
        .attr("y", function (d, i) { return i * 25; })
        .transition().delay(1000).duration(2000)
        .attr("width", x);

    //put labels on the bars
    genderChart.selectAll(".gLabel")
        .data([males, females])
      .enter().append("text")
        
        .attr("x", x)
        .attr("y", function (d, i) { return i * 25 + 10; })
        .attr("dx", -2)
        .attr("dy" ,".35em")
        .attr("font-family", "Helvetica Neue")
        .attr("fill", "white")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .transition().delay(2000)
        .text(String);

    //put labels on the axis
    genderChart.selectAll(".gLabel")
      .data(["Male", "Female"])
      .enter().append("text")
        
        .attr("x", 0)

        .attr("y", function (d, i) { return i * 25 + 10; })
        .transition().duration(1000)
        .attr("dx", -margin.left)
        .attr("dy" ,".35em")
        .attr("font-family", "Helvetica Neue")
        .attr("fill", "black")
        .attr("font-size", 10)
        .attr("text-anchor", "start")
        .text(String);

    //+++++++++++++++++++++++++++++++++++++++++++ End gender Distribution Chart +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

        //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //+++++++++++++++++++++++++++++++++++++++++++ Contract Distribution Chart +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    
    //create SVG area for the chart
    var contractChart = d3.select("#contract").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); // padding for the labels

    //set up a scale for the chart
      x.domain([0,contractMax]).range([0,300]);
      ///y.domain(dataset.map(function (d) { return d.Department }));???

    contractChart.selectAll(".bar")
        .data(ctcounts)
      .enter().append("rect")
        
        .attr("class", "bar")
        
        .attr("height", 20)
        
        .attr("y", function (d, i) { return i * 25; })
        .transition().delay(1000).duration(2000)
        .attr("width", x);

    //put labels on the bars
    contractChart.selectAll(".cLabel")
        .data(ctcounts)
      .enter().append("text")
        
        .attr("x", x)
        .attr("y", function (d, i) { return i * 25 + 10; })
        .attr("dx", -2)
        .attr("dy" ,".35em")
        .attr("font-family", "Helvetica Neue")
        .attr("fill", "white")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .transition().delay(2000)
        .text(String);

    //put labels on the axis
    contractChart.selectAll(".cLabel")
      .data(contractTypesUnique)
      .enter().append("text")
        
        .attr("x", 0)

        .attr("y", function (d, i) { return i * 25 + 10; })
        .transition().duration(1000)
        .attr("dx", -margin.left)
        .attr("dy" ,".35em")
        .attr("font-family", "Helvetica Neue")
        .attr("fill", "black")
        .attr("font-size", 10)
        .attr("text-anchor", "start")
        .text(String);

    //+++++++++++++++++++++++++++++++++++++++++++ End Contract Distribution Chart +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //+++++++++++++++++++++++++++++++++++++++++++ gender Distribution Pie Chart +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    
    // var pie = d3.layout.pie().sort(null);

    // var color = d3.scale.ordinal().range(["#6699cc", "#ff9900", "#003366", "#9c9284", "#CCCC99", "#E6E6CC"]);

    // var arc = d3.svg.arc()
    //   .innerRadius(radius - 60)
    //   .outerRadius(radius - 20);

    // //create SVG area for the chart
    // var departmentgenderChart = d3.select("#gender").append("svg")
    // .attr("width", piewidth)
    // .attr("height", pieheight)
    // .append("g")
    // .attr("transform", "translate(" + piewidth / 2 + "," + pieheight / 2 + ")");

    // var g = departmentgenderChart.selectAll(".arc")
    //   .data(pie([males, females]))
    //   .enter().append("g")
    //   .attr("class", "arc");

    //   g.append("path")
    //   .transition().delay(1000).duration(1000)
    //   .attr("d", arc)
    //   .style("fill", function(d) { return color(d.value); });

    //   g.append("text")
    //   .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
    //   .attr("dy", ".35em")
    //   .style("text-anchor", "middle")
    //   .style("fill", "white")
    //   .style("font-size", 10)
    //   .text(function(d) { return d.value; });

    //+++++++++++++++++++++++++++++++++++++++++++ End gender Chart +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


  })

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //+++++++++++++++++++++++++++++++++++++++++++ Table +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
   d3.text("data/faculty.csv", function(dataText) { 

    var parsedCSV = d3.csv.parseRows(dataText); // for making the table

    var overviewTable = d3.select("#overviewTable")
      .append("table")
      .style("border-collapse", "collapse")
      

      .selectAll("tr")
      .data(parsedCSV)
      .enter().append("tr")
      .on("mouseover", function() {d3.select(this).style("background-color", "aliceblue")})
      .on("mouseout", function() {d3.select(this).style("background-color", "white")})

      .selectAll("td")
      .data(function(d){return d;})
      .enter().append("td")
      .style("padding", "8px")
      .text(function(d){return d;})
      .style("font-size", "11px")
      .style("color", "black")
      .style("letter-spacing", "0.1em")
      .style("font-family", "Helvetica Neue");
  });
    //+++++++++++++++++++++++++++++++++++++++++++ End Table +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++//
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




  // removes duplicates and returns distinct array
  function eliminateDuplicates(arr) {
    var i,
        len=arr.length,
        out=[],
        obj={};

    for (i=0;i<len;i++) {
      obj[arr[i]]=0;
    }
    for (i in obj) {
      out.push(i);
    }
    return out;
  }

  //takes an object with key:value pairs...returns the highest of the values
  function getHighestCount (counts) {
    var highest = 0;
    Object.keys(counts).forEach(function (d) {
      if (counts[d] >= highest)
        highest = counts[d];
    });
    return highest; 
  }





  //the "g" is an svg grouping element. it groups all shapes within it together so the whole group
  //can be transformed as if it were a single shape. the group here is being translated according
  //to the specified values for the margins--"margin.left" units to the right and "margin.top" to the bottom
  //the transform function transforms the coordinate space
  var svg = d3.select("#vizarea1").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("margin-left", -margin.left + "px")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


}());