    class AreaChart {
        constructor(parentElement, data) {
            this.parentElement = parentElement;
            this.data = data;
            this.initVis();
        }

        initVis() {
            let vis = this;
        
            vis.margin = { top: 40, right: 150, bottom: 100, left: 100 };
            vis.width = 800 - vis.margin.left - vis.margin.right;
            vis.height = 600 - vis.margin.top - vis.margin.bottom;
        
            vis.svg = d3.select(`#${vis.parentElement}`)
                .append("svg")
                .attr("width", vis.width + vis.margin.left + vis.margin.right)
                .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
                .style("display", "block")  // Makes sure the SVG behaves like a block element
                .style("margin", "auto")   // Centers it if the parent container has `text-align: center`
                .append("g")
                .attr("transform", `translate(${(vis.margin.left + vis.margin.right) / 2},${vis.margin.top})`); 
        
            vis.xScale = d3.scaleTime().range([0, vis.width]);
            vis.yScale = d3.scaleLinear().range([vis.height, 0]);
            vis.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        
            vis.xAxisGroup = vis.svg.append("g")
                .attr("transform", `translate(0,${vis.height})`);
            vis.yAxisGroup = vis.svg.append("g");
        
            vis.area = d3.area()
                .x(d => vis.xScale(d.data.date))
                .y0(d => vis.yScale(d[0])) 
                .y1(d => vis.yScale(d[1])) 
                .curve(d3.curveMonotoneX);
        
            vis.tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background-color", "lightsteelblue")
                .style("padding", "5px")
                .style("border-radius", "5px")
                .style("visibility", "hidden")
                .style("top", "0px") 
                .style("left", "0px")  
                .style("z-index", "1000"); 
        
            vis.wrangleData();
        }
        

    wrangleData() {
        let vis = this;
    
        // Use d3.mean instead of d3.sum to calculate the mean price
        let aggregatedData = d3.rollup(
            vis.data,
            v => d3.mean(v, d => d.price), // Calculate the mean price
            d => d.date,
            d => d.region
        );
    
        // Extract and sort dates
        vis.dates = Array.from(aggregatedData.keys())
            .map(d => new Date(d))
            .sort(d3.ascending);
    
        // Extract unique regions
        vis.regions = Array.from(new Set(vis.data.map(d => d.region)));
    
        // Process data to create an array of objects with date and mean prices by region
        vis.processedData = vis.dates.map(date => {
            let obj = { date };
            vis.regions.forEach(region => {
                obj[region] = aggregatedData.get(date)?.get(region) || 0; // Use mean value or 0 if no data exists
            });
            return obj;
        });
    
        // Add title for the graph
        vis.svg.append("text")
            .attr("x", vis.width / 2)  
            .attr("y", 0 - (vis.margin.top / 2)) 
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("Average Price of Canadian Grocery Items");
    
        vis.updateVis();
    }

    updateVis() {
        let vis = this;


        vis.xScale.domain(d3.extent(vis.processedData, d => d.date));
        vis.yScale.domain([0, d3.max(vis.processedData, d => 
            d3.sum(vis.regions, region => d[region]))
        ]);

        const stack = d3.stack()
            .keys(vis.regions)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        const series = stack(vis.processedData);

        vis.svg.selectAll(".area")
            .data(series)
            .join("path")
            .attr("class", "area")
            .attr("fill", d => vis.colorScale(d.key))
            .attr("opacity", 0.8)
            .attr("d", vis.area)
            .on("mouseover", (event, d) => {
                const region = d.key; // Correct way to access the region name
                const value = d[d.length - 1][1] - d[d.length - 1][0]; // Get the last stacked value
        
                console.log(`<strong>Region:</strong> ${region}<br><strong>Value:</strong> ${value}`); // Debugging
                vis.tooltip
                    .style("opacity", 1)
                    .style("left", event.pageX + 20 + "px")
                    .style("top", event.pageY + "px")
                    .style("visibility", "visible")
                    .html(`<strong>Region:</strong> ${region}<br><strong>Value:</strong> ${value.toFixed(4)}`)

            })
            .on("mouseout", function(event, d) {
        
                vis.tooltip
                    .style("opacity", 0)
                    .style("left", "0px")
                    .style("top", "0px")
                    .html(""); // Clear tooltip content;
            });

        vis.xAxisGroup.call(d3.axisBottom(vis.xScale).tickFormat(d3.timeFormat("%Y-%m")).ticks(5));
        vis.yAxisGroup.call(
            d3.axisLeft(vis.yScale)
                .tickFormat(d3.format("$,.2f"))
        );
                // Increase font size
        vis.yAxisGroup.selectAll("text")
        .style("font-size", "14px") // Adjust size as needed
        .style("font-family", "Arial"); // Optional: Change font family

        vis.xAxisGroup.call(d3.axisBottom(vis.xScale));

        vis.xAxisGroup.selectAll("text")
        .style("font-size", "14px") // Adjust size as needed
        .style("font-family", "Arial"); // Optional
        const legend = vis.svg.selectAll(".legend")
            .data(vis.regions)
            .join("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${vis.width + 10}, ${i * 20})`);

        legend.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => vis.colorScale(d));

        legend.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(d => d)
            .style("font-size", "14px");
    }
}
