class LineChart {
    constructor(parentElement, data) {
        this.parentElement = parentElement;
        this.data = data;
        this.selectedInterval = '8-year'; 
        this.initVis();
    }


    
        getWindowSize(interval) {
            switch(interval) {
                case '8-year': return 8;
                case '4-year': return 4;
                case '2-year': return 2;
                case '1-year': return 1;
                default: return 8;
            }
        }
        processData(data, interval) {
            const windowSize = this.getWindowSize(interval);
            const processedData = [];
            
            const minDate = d3.min(data, d => d.date);
            const maxDate = d3.max(data, d => d.date);
            
            // Group by groceryType
            const groupedByType = d3.group(data, d => d.groceryType);
            
            groupedByType.forEach((typeData, groceryType) => {
                // Sort data by date
                const sortedData = Array.from(typeData).sort((a, b) => a.date - b.date);
                
                // Special handling for 1-year interval (year-over-year comparison)
                if (interval === '1-year') {
                    // Group by year
                    const yearlyGroups = d3.group(sortedData, d => d.date.getFullYear());
                    const years = Array.from(yearlyGroups.keys()).sort((a,b) => a-b);
                    
                    for (let i = 1; i < years.length; i++) {
                        const year = years[i];
                        const prevYear = years[i-1];
                        
                        const currentData = yearlyGroups.get(year);
                        const prevData = yearlyGroups.get(prevYear);
                        
                        if (currentData && prevData) {
                            const currentAvg = d3.mean(currentData, d => d.price);
                            const prevAvg = d3.mean(prevData, d => d.price);
                            const change = (currentAvg - prevAvg) / prevAvg;
                            
                            processedData.push({
                                groceryType: groceryType,
                                date: new Date(year, 0, 1),
                                avgPrice: currentAvg,
                                priceIncrease: change,
                                period: `${year}`,
                                comparison: `vs ${prevYear}`,
                                dataPoints: currentData.length
                            });
                        }
                    }
                } 
                else {
                    const startYear = minDate.getFullYear();
                    const endYear = maxDate.getFullYear();
                    
                    for (let year = startYear; year <= endYear; year++) {
                        const currentDate = new Date(year, 0, 1);
                        
                        const windowStart = new Date(currentDate);
                        windowStart.setFullYear(windowStart.getFullYear() - Math.floor(windowSize/2));
                        
                        const windowEnd = new Date(currentDate);
                        windowEnd.setFullYear(windowEnd.getFullYear() + Math.ceil(windowSize/2) - 1);
                        
                        const windowData = sortedData.filter(d => 
                            d.date >= (windowStart < minDate ? minDate : windowStart) && 
                            d.date <= (windowEnd > maxDate ? maxDate : windowEnd)
                        );
                        
                        if (windowData.length === 0) continue;
                        
                        const yearlyGroups = d3.group(windowData, d => d.date.getFullYear());
                        
                        const yearlyChanges = [];
                        let previousYearAvg = null;
                        
                        const sortedYears = Array.from(yearlyGroups.keys()).sort((a,b) => a-b);
                        sortedYears.forEach(year => {
                            const yearData = yearlyGroups.get(year);
                            const currentAvg = d3.mean(yearData, d => d.price);
                            
                            if (previousYearAvg !== null) {
                                const change = (currentAvg - previousYearAvg) / previousYearAvg;
                                yearlyChanges.push(change);
                            }
                            
                            previousYearAvg = currentAvg;
                        });
                        
                        if (yearlyChanges.length > 0) {
                            processedData.push({
                                groceryType: groceryType,
                                date: currentDate,
                                avgPrice: d3.mean(windowData, d => d.price),
                                priceIncrease: d3.mean(yearlyChanges),
                                period: `${windowStart.getFullYear()}-${windowEnd.getFullYear()}`,
                                dataPoints: windowData.length,
                                numComparisons: yearlyChanges.length
                            });
                        }
                    }
                }
            });
            
            return processedData;
        }
    // Helper to get window size in years
    getWindowSize(interval) {
        switch(interval) {
            case '8-year': return 8;
            case '4-year': return 4;
            case '2-year': return 2;
            case '1-year': return 1;
            default: return 8; 
        }
    }
    

    initVis() {
        let vis = this;

        // Margin and SVG setup
        vis.margin = { top: 80, right: 180, bottom: 80, left: 80 };
        vis.width = 1200 - vis.margin.left - vis.margin.right;
        vis.height = 600 - vis.margin.top - vis.margin.bottom;
        
        // Create SVG
        vis.svg = d3.select(`#${vis.parentElement}`)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left},${vis.margin.top})`);

        // Add title
        vis.svg.append("text")
            .attr("x", vis.width / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .style("font-size", "20px")
            .style("font-weight", "bold")
            .text("Grocery Price Changes Over Time");


        vis.x = d3.scaleTime().range([0, vis.width]);
        vis.y = d3.scaleLinear()
            .domain([-0.05, 0.25]) 
            .range([vis.height, 0]);

        vis.xAxis = vis.svg.append("g")
            .attr("transform", `translate(0,${vis.height})`);
        
        vis.yAxis = vis.svg.append("g");

        vis.zeroLine = vis.svg.append("line")
            .attr("class", "zero-line")
            .attr("x1", 0)
            .attr("x2", vis.width)
            .attr("stroke", "#999")
            .attr("stroke-dasharray", "4,2");

        // Color scale
        vis.colorScale = d3.scaleOrdinal()
            .range(d3.schemeTableau10);

        vis.line = d3.line()
            .x(d => vis.x(d.date))
            .y(d => vis.y(d.priceIncrease))
            .curve(d3.curveMonotoneX);

        // Create tooltip container (but keep hidden)
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("opacity", 0);

        // Legend group
        vis.legend = vis.svg.append("g")
            .attr("transform", `translate(${vis.width + 20}, 20)`);

        d3.select("#interval-selector")
            .on("change", function() {
                vis.selectedInterval = this.value;
                console.log(vis.selectedInterval);
                vis.wrangleData();
            });

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;
        
        vis.processedData = this.processData(vis.data, vis.selectedInterval);
        
        vis.colorScale.domain([...new Set(vis.processedData.map(d => d.groceryType))]);
        
        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        vis.x.domain(d3.extent(vis.processedData, d => d.date));
        // vis.y.domain([
        //     d3.min(vis.processedData, d => d.priceIncrease) * 1.1,
        //     d3.max(vis.processedData, d => d.priceIncrease) * 1.1
        // ]).nice();

        vis.xAxis.transition().duration(500).call(d3.axisBottom(vis.x));
        vis.yAxis.transition().duration(500).call(d3.axisLeft(vis.y).tickFormat(d3.format(".0%")));

        vis.zeroLine
            .transition().duration(500)
            .attr("y1", vis.y(0))
            .attr("y2", vis.y(0));

        const lineData = d3.group(vis.processedData, d => d.groceryType);

        const lines = vis.svg.selectAll(".line")
            .data(lineData, d => d[0]);

        lines.exit().remove();

        lines.enter()
            .append("path")
            .attr("class", "line")
            .attr("fill", "none")
            .attr("stroke", d => vis.colorScale(d[0]))
            .attr("stroke-width", 2)
            .merge(lines)
            .transition().duration(500)
            .attr("d", d => vis.line(d[1]));

        // Update dots
        const dots = vis.svg.selectAll(".dot")
            .data(vis.processedData, d => `${d.groceryType}-${d.date.getTime()}`);

        dots.exit().remove();

        dots.enter()
            .append("circle")
            .attr("class", "dot")
            .attr("r", 5)
            .attr("cx", d => vis.x(d.date))
            .attr("cy", d => vis.y(d.priceIncrease))
            .attr("fill", d => vis.colorScale(d.groceryType))
            .on("mouseover", function(event, d) {
                d3.select(this).attr("r", 8);
                vis.tooltip
                    .html(`
                        <strong>${d.groceryType}</strong><br>
                        Period: ${d.period}<br>
                        Avg Price: $${d.avgPrice.toFixed(2)}<br>
                        Change: ${(d.priceIncrease * 100).toFixed(1)}%
                    `)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 28}px`)
                    .style("opacity", 1);
            })
            .on("mouseout", function() {
                d3.select(this).attr("r", 5);
                vis.tooltip.style("opacity", 0);
            })
            .merge(dots)
            .transition().duration(500)
            .attr("cx", d => vis.x(d.date))
            .attr("cy", d => vis.y(d.priceIncrease));

        const categories = [...new Set(vis.processedData.map(d => d.groceryType))];
        const legendItems = vis.legend.selectAll(".legend-item")
            .data(categories, d => d);

        legendItems.exit().remove();

        const legendEnter = legendItems.enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        legendEnter.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => vis.colorScale(d));

        legendEnter.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(d => d)
            .style("font-size", "12px");

        legendItems.merge(legendEnter)
            .transition().duration(500)
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);
    }
}