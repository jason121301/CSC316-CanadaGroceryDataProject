class CircleChart {
    constructor(parentElement, data, percent) {
        this.parentElement = parentElement;
        this.data = data;
        this.percent = percent;
        this.initVis();
    }

    initVis() {
        let vis = this;

        // Set up dimensions
        vis.width = 350;
        vis.height = 350;
        vis.radius = Math.min(vis.width, vis.height) / 2;
        vis.margin = { top: 50, right: 150, bottom: 50, left: 25 };


        // Set up SVG
        vis.svg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left + vis.width / 2},${vis.margin.top + vis.height / 2})`);

        // Set up color scale
        vis.colorScale = d3.scaleOrdinal(d3.schemeCategory10);

        // Set up pie chart generator
        vis.pie = d3.pie()
            .value(d => d.value)
            .sort(null);

        // Set up arc generator
        vis.arc = d3.arc()
            .outerRadius(vis.radius - 10)
            .innerRadius(0);

        vis.labelArc = d3.arc()
            .outerRadius(vis.radius - 40)
            .innerRadius(vis.radius - 40);
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

        document.querySelectorAll('#category-selector .form-check-input').forEach(checkbox => {
            checkbox.addEventListener('change', () => vis.wrangleData());
        });
        const yearRangeSlider = document.getElementById('yearRange');
        if (yearRangeSlider && yearRangeSlider.noUiSlider) {
            yearRangeSlider.noUiSlider.on('update', function(values) {
                const [minSelectedYear, maxSelectedYear] = values.map(Number); // Get selected range
                vis.minYear = minSelectedYear; // Store min year
                vis.maxYear = maxSelectedYear; // Store max year
                vis.wrangleData();
            });
    }
        vis.wrangleData();
        const titleText = vis.percent ? "Yearly Rate of Change by Grocery Type" : "Average Price per 100 gram by Grocery Type";


        vis.svg.append("text")
            .attr("x", 0)  
            .attr("y", 0 - vis.height/2) 
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text(titleText);
        
            
    }

    wrangleData() {
        let vis = this;
    
    // Step 1: Get selected categories from the checkboxes
    const selectedCategories = [];
    document.querySelectorAll('#category-selector .form-check-input:checked').forEach(checkbox => {
        if (checkbox.value === "All") {
            selectedCategories.push("All");
            return;
        }
        selectedCategories.push(checkbox.value);
    });
    console.log(selectedCategories);
    // Step 2: Filter the data based on selected categories
    let filteredData;
    if (selectedCategories.includes("All")) {
        filteredData = vis.data;
    } else {
        filteredData = vis.data.filter(d => selectedCategories.includes(d.groceryType));
    }

    // Step 3: Filter the data based on the selected year range
    if (vis.minYear && vis.maxYear) {
        filteredData = filteredData.filter(d => {
            const year = d.date.getFullYear();
            return year >= vis.minYear && year <= vis.maxYear;
        });
    }
        vis.chartData = [];
    
        if (vis.percent) {
            const groceryData = d3.groups(filteredData, d => d.groceryType);
    
            groceryData.forEach(([groceryType, values]) => {
                const yearlyData = d3.groups(values, d => d.date.getFullYear());
            
                yearlyData.sort((a, b) => a[0] - b[0]);
            
                const yearlyPercentageChanges = [];
                for (let i = 1; i < yearlyData.length; i++) {
                    const currentYear = yearlyData[i][0];
                    const currentYearPrices = yearlyData[i][1].map(d => d.price);
                    const previousYearPrices = yearlyData[i - 1][1].map(d => d.price);
            
                    const currentYearAvg = d3.mean(currentYearPrices);
                    const previousYearAvg = d3.mean(previousYearPrices);
            
                    if (previousYearAvg === 0) {
                        console.warn(`Skipping percentage change calculation for ${groceryType} in year ${currentYear} because previous year's average price is 0.`);
                        continue;
                    }
            
                    const percentageChange = ((currentYearAvg - previousYearAvg) / previousYearAvg) * 100;
                    yearlyPercentageChanges.push(percentageChange);
                }
            
                const avgPercentageChange = d3.mean(yearlyPercentageChanges);
            
                vis.chartData.push({
                    label: groceryType,
                    value: avgPercentageChange
                });
            });
        } else {
            const groceryData = d3.groups(filteredData, d => d.groceryType); // Group by groceryType
            vis.chartData = groceryData.map(([groceryType, values]) => {
                const filteredValues = values.filter(d => d.unit === "No");
    
                const avgPrice = d3.mean(filteredValues, d => d.price * d.ratioTo100Gram); // Average price
                return {
                    label: groceryType,
                    value: avgPrice
                };
            });
        }
    
        vis.updateVis();
    }
    

    updateVis() {
        let vis = this;
    
        // Separate positive and negative values
        const positiveData = vis.chartData.filter(d => d.value >= 0);
        const negativeData = vis.chartData.filter(d => d.value < 0);
    
        // Calculate total value for percentage calculation (for positive data)
        const totalValue = d3.sum(positiveData, d => d.value);
    
        // Bind data to pie chart slices (main pie chart for positive values)
        const arcs = vis.svg.selectAll(".arc")
            .data(vis.pie(positiveData));
    
        // Enter selection: Create new arcs
        const enterArcs = arcs.enter()
            .append("g")
            .attr("class", "arc");
    
        // Add paths for the arcs (main pie chart)
        enterArcs.append("path")
            .attr("d", vis.arc)
            .style("fill", d => vis.colorScale(d.data.label))
            .on("mouseover", function(event, d) {
                const valueLabel = vis.percent ? "Average Percentage Change" : "Average Price Per 100 Grams";
                const valueText = vis.percent ? `${d.data.value.toFixed(2)}%` : `$${d.data.value.toFixed(2)}`;
                vis.tooltip
                    .style("opacity", 1)
                    .style("left", event.pageX + 20 + "px")
                    .style("top", event.pageY + "px")
                    .style("visibility", "visible")
                    .html(`
                        <strong>Category:</strong> ${d.data.label}<br>
                        <strong>Percentage:</strong> ${((d.data.value / totalValue) * 100).toFixed(2)}%<br>
                        <strong>${valueLabel}:</strong> ${valueText}
                    `);
    
                // Highlight the slice
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("opacity", 0.7);
            })
            .on("mousemove", function(event) {
                vis.tooltip
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 10}px`);
            })
            .on("mouseout", function() {
                vis.tooltip
                    .style("opacity", 0)
                    .style("left", "0px")
                    .style("top", "0px")
                    .html("");
    
                // Restore slice opacity
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style("opacity", 1);
            });
    
        // Update selection: Update existing arcs
        arcs.select("path")
            .attr("d", vis.arc)
            .style("fill", d => vis.colorScale(d.data.label));
    
        // Exit selection: Remove old arcs
        arcs.exit().remove();
    
        // Clear existing labels before redrawing
        vis.svg.selectAll(".arc text").remove();
    
        // Add labels (main pie chart)
        const labels = vis.svg.selectAll(".arc")
            .append("text")
            .attr("transform", function(d) {
                return "translate(" + vis.labelArc.centroid(d) + ")";
            })
            .attr("dy", ".35em")
            .style("text-anchor", "middle")
            .text(d => d.data.label);
    
        // Update labels (main pie chart)
        labels.text(d => (vis.percent ? `${d.data.value.toFixed(2)}%` : `$${d.data.value.toFixed(2)}`));
    
        // Add legend if percent is true (main pie chart)
            vis.svg.selectAll(".legend").remove();
    
            const legend = vis.svg.selectAll(".legend")
                .data(positiveData)
                .enter()
                .append("g")
                .attr("class", "legend")
                .attr("transform", (d, i) => `translate(${vis.width / 2 + 20}, ${i * 20 - vis.height / 2 + 20})`);
    
            // Add colored rectangles for the legend
            legend.append("rect")
                .attr("width", 15)
                .attr("height", 15)
                .style("fill", d => vis.colorScale(d.label));
    
            // Add text labels for the legend
            legend.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .text(d => d.label)
                .style("font-size", "12px")
                .style("fill", "black");    
        vis.svg.selectAll(".negative-values-text").remove();

        // Display negative values in a text box
        if (negativeData.length > 0) {
            console.log("negative data exist");
            // Remove existing text box (if any)
            vis.svg.selectAll(".negative-values-text").remove();
        
            // Create a text box for negative values
            const negativeValuesText = vis.svg.append("g")
                .attr("class", "negative-values-text")
                .attr("transform", `translate(${vis.width / 2 - 30}, ${vis.height / 2 - 40})`);
        
            // Calculate the dimensions of the text box
            const textBoxWidth = 200; // Adjust as needed
            const textBoxHeight = 20 + negativeData.length * 20; // Adjust based on the number of items
            const padding = 10; // Padding around the text
        
            // Add a background rectangle
            negativeValuesText.append("rect")
                .attr("x", -padding) // Adjust for padding
                .attr("y", -padding - 10) // Adjust for padding
                .attr("width", textBoxWidth + 2 * padding) // Add padding to both sides
                .attr("height", textBoxHeight + 2 * padding) // Add padding to top and bottom
                .style("fill", "lightgreen") // Light gray background color
                .style("stroke", "#dee2e6") // Border color
                .style("stroke-width", 1); // Border width
        
            // Add a title for the text box
            negativeValuesText.append("text")
                .attr("x", 0)
                .attr("y", 0)
                .style("font-size", "14px")
                .style("font-weight", "bold")
                .text("Negative Rates of Change:");
        
            // Add negative values as text
            negativeData.forEach((d, i) => {
                negativeValuesText.append("text")
                    .attr("x", 0)
                    .attr("y", 20 + i * 20) // Adjust spacing between lines
                    .style("font-size", "12px")
                    .text(`${d.label}: ${d.value.toFixed(2)}%`);
            });
        }
    }
}