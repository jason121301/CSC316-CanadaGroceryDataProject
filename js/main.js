/* * * * * * * * * * * * * *
 *           MAIN           *
 * * * * * * * * * * * * * */

// init global variables, switches, helper functions
let myPieChart, myMapVis, myDotChart;

let processedData;

function loadData() {
	Promise.all([d3.csv("data/dataMapping.csv"), d3.csv("data/groceryData.csv")])
		.then(([groceryData, priceData]) => {
			// Create a mapping of product to grocery type, ratio to 100 gram, and unit
			const groceryMap = {};
			groceryData.forEach((d) => {
				groceryMap[d.Products] = {
					groceryType: d["Grocery Type"],
					ratioTo100Gram: +d["Ratio to 100 Gram"],
					unit: d["Unit"],
				};
			});

			// Process price data
			processedData = priceData.map((d) => {
				const groceryInfo = groceryMap[d.Products] || {
					groceryType: "Unknown",
					ratioTo100Gram: 1,
					unit: "Unknown",
				};
				return {
					date: d3.timeParse("%Y-%m")(d.REF_DATE),
					product: d.Products,
					groceryType: groceryInfo.groceryType,
					ratioTo100Gram: groceryInfo.ratioTo100Gram,
					unit: groceryInfo.unit,
					price: +d.VALUE,
					region: d.GEO,
				};
			});
			initMainPage(processedData);
			console.log("Data Loaded:", processedData); // Debugging output
		})
		.catch((error) => {
			console.error("Error loading data:", error);
		});
}

// Call main function to load and process data
loadData();

// initMainPage
function initMainPage(processedData) {
	// log data
	// console.log(allDataArray);
	myDotChart = new DotChart("dotChart", processedData);
	myBarChart = new BarChart("barChart", processedData);
}
