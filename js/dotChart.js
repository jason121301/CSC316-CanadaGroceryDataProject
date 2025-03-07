class DotChart {

    
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.initVis();
    }

    getHalfYear(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        return `${year}-H${month < 6 ? 1 : 2}`;
    }

    // Group and process data
    processData(data) {
        // Group by groceryType, region, and half-year period
        const groupedData = d3.group(data, 
            d => d.groceryType,                
            d => d.region,                      
            d => this.getHalfYear(d.date)         
        );
    
        // Calculate the average price and percentage change for each group and flatten the data
        const processedData = [];
        
        groupedData.forEach((regionMap, groceryType) => {
            regionMap.forEach((halfYearMap, region) => {
                let previousAvgPrice = 0; // To track the previous average price
                halfYearMap.forEach((group, halfYear) => {
                    const avgPrice = d3.mean(group, d => d.price);
                    const date = group[0].date; // Take the date from the first entry
                    
                    let priceIncrease = 0;  // Default to 0% for the first entry
                    if (previousAvgPrice > 0) {
                        priceIncrease = ((avgPrice - previousAvgPrice) / previousAvgPrice);
                        processedData.push({
                            groceryType: groceryType,
                            region: region,
                            halfYear: halfYear,
                            avgPrice: avgPrice,
                            priceIncrease: priceIncrease,
                            date: date
                        });
                    }
                    
                    previousAvgPrice = avgPrice;
                });
            });
        });
    
        return processedData;
    }

    initVis() {
        let vis = this;

        // Margin and SVG setup
        vis.margin = { top: 50, right: 30, bottom: 50, left: 50 };
        vis.width = 800 - vis.margin.left - vis.margin.right;
        vis.height = 500 - vis.margin.top - vis.margin.bottom;
        

        vis.svg = d3.select(`#${vis.parentElement}`).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);
        // Add title for the graph
        vis.svg.append("text")
            .attr("x", vis.width / 2)  
            .attr("y", 0 - (vis.margin.top / 2)) 
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("Changes in Canadian Grocery Prices by Year");

        // Add X axis title
        vis.svg.append("text")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + vis.margin.bottom - 10) 
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Year");

        // Add Y axis title
        vis.svg.append("text")
            .attr("transform", "rotate(-90)") 
            .attr("x", -vis.height / 2) 
            .attr("y", 0 - vis.margin.left + 10) 
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Percentage Change in Average Grocery Price");


          
        // Process the data (group by product, region, and half-year, then average the price)
        const processedData = this.processData(this.data);
        // Scales
        vis.x = d3.scaleTime()
        .domain([
            d3.timeMonth.offset(d3.min(processedData, d => d.date), -3), // Subtract one year
            d3.max(processedData, d => d.date) // Max date stays the same
        ])
        .range([0, vis.width]);

        vis.y = d3.scaleLinear()
            .domain([d3.min(processedData, d=>d.priceIncrease) - 0.01, d3.max(processedData, d => d.priceIncrease)])
            .range([vis.height, 0]);

        // Axes
        vis.xAxis = vis.svg.append("g")
            .attr("transform", `translate(0,${vis.height})`)
            .call(d3.axisBottom(vis.x));

        // Define a format function to append "%" to the values
        const percentFormat = d3.format(".0%");  // Adjust precision as needed

        // Create the Y-axis with percentage formatting
        vis.yAxis = vis.svg.append("g")
            .call(d3.axisLeft(vis.y)
                .tickFormat(percentFormat)  // Apply the percentage format
            );
        // Add a black line at 0% to split the graph
        vis.svg.append("line")
            .attr("x1", 0)  
            .attr("x2", vis.width) 
            .attr("y1", vis.y(0))  
            .attr("y2", vis.y(0))  
            .attr("stroke", "red") 
            .attr("stroke-width", 1); 
        vis.updateVis(processedData);
        }

    updateVis(processedData) {
        let vis = this;
        
        // Create a tooltip
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background-color", "lightsteelblue")
            .style("padding", "5px")
            .style("border-radius", "5px")
            .style("visibility", "hidden")
            .style("top", "0px") 
            .style("left", "0px")  
            .style("z-index", "1000"); 
   
        
        const colorScale = d3.scaleOrdinal()
        .domain([...new Set(processedData.map(d => d.groceryType))])  
        .range(d3.schemeCategory10); // 

        vis.dots = vis.svg.selectAll(".dot")
            .data(processedData)
            .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => {
                
                const randomOffset = Math.random() * 10 - 5; 
                return vis.x(d.date) + randomOffset;
            })
            .attr("cy", d => vis.y(d.priceIncrease))
            .attr("r", 4)
            .style("fill", d => colorScale(d.groceryType)) 
            .on("mouseover", function(event, d) {
                console.log(`Tooltip HTML: Price: $${d.avgPrice.toFixed(2)}<br>Grocery Type: ${d.groceryType}<br>Region: ${d.region}`);

                d3.select(this)
                    .attr("stroke-width", "2px")
                    .attr("stroke", "black")
                    .attr("fill", "rgba(173,222,255,0.62)");
        
                tooltip
                    .style("opacity", 1)
                    .style("left", event.pageX + 20 + "px")
                    .style("top", event.pageY + "px")
                    .style("visibility", "visible")
                    .html(`
                        <div style="border: thin solid grey; border-radius: 5px; background: lightgrey; padding: 10px">
                            <h3>Price: $${d.avgPrice.toFixed(2)}</h3>
                            <h4>Grocery Type: ${d.groceryType}</h4>
                            <h4>Region: ${d.region}</h4>
                        </div>
                    `);
                console.log("After Tooltip Update: ", tooltip.style("visibility"), tooltip.style("opacity"), tooltip.style("top"), tooltip.style("left"));

            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .attr("stroke-width", "0px")
                    .attr("fill", colorScale(d.groceryType));
        
                tooltip
                    .style("opacity", 0)
                    .style("left", "0px")
                    .style("top", "0px")
                    .html(""); // Clear tooltip content;
            });
    }
}