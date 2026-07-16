/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Target, Zap } from 'lucide-react';

interface BranchEntropyD3ChartProps {
  branchId: string;
  uncertainty: number; // 0 - 100
  evaluationScore: number; // 0 - 100
}

export const BranchEntropyD3Chart: React.FC<BranchEntropyD3ChartProps> = ({
  branchId,
  uncertainty,
  evaluationScore,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsedState, setCollapsedState] = useState<{ x: number; y: number } | null>(null);
  const [hoveredState, setHoveredState] = useState<{ x: number; y: number; density: number } | null>(null);

  // Derive distribution parameters
  // uncertainty maps to mean entropy (H(x)) between 0.1 and 0.9
  const mean = Math.max(0.1, Math.min(0.9, uncertainty / 100));
  // evaluationScore maps to standard deviation (width of curve)
  const sd = 0.05 + (evaluationScore / 800);

  // Generate data points representing the PDF (Probability Density Function)
  const points = React.useMemo(() => {
    const pts = [];
    for (let x = 0; x <= 1.05; x += 0.02) {
      const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(sd, 2));
      const y = (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      pts.push({ x, y });
    }
    return pts;
  }, [mean, sd]);

  // Max density value for scale bounds
  const maxDensity = Math.max(...points.map((p) => p.y));

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous elements
    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll('*').remove();

    // Get container dimensions
    const width = containerRef.current.clientWidth || 280;
    const height = 110;

    const margin = { top: 15, right: 15, bottom: 20, left: 30 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create scales
    const xScale = d3.scaleLinear().domain([0, 1.0]).range([0, chartWidth]);
    const yScale = d3.scaleLinear().domain([0, maxDensity * 1.1]).range([chartHeight, 0]);

    // Outer SVG setups
    svgElement
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svgElement
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Add definition for gradients and filters
    const defs = svgElement.append('defs');

    // Glow filter for interactive laser guide
    const glowFilter = defs.append('filter').attr('id', 'entropyGlow');
    glowFilter
      .append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Linear gradient for area fill
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', `areaGrad-${branchId}`)
      .attr('x1', '0')
      .attr('y1', '0')
      .attr('x2', '0')
      .attr('y2', '1');

    areaGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#6366f1')
      .attr('stop-opacity', 0.25);

    areaGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#6366f1')
      .attr('stop-opacity', 0);

    // Draw minimal gridlines
    g.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .call(
        d3
          .axisLeft(yScale)
          .ticks(3)
          .tickSize(-chartWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#475569')
      .attr('stroke-dasharray', '2,2');

    // Render dynamic area under curve
    const areaGen = d3
      .area<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y0(chartHeight)
      .y1((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(points)
      .attr('class', 'area-path')
      .attr('fill', `url(#areaGrad-${branchId})`)
      .attr('d', areaGen);

    // Render stroke line
    const lineGen = d3
      .line<{ x: number; y: number }>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(points)
      .attr('class', 'line-path')
      .attr('fill', 'none')
      .attr('stroke', '#818cf8')
      .attr('stroke-width', 1.5)
      .attr('d', lineGen);

    // Render x-axis
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues([0, 0.25, 0.5, 0.75, 1.0])
      .tickFormat(d3.format('.2f'));

    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#334155').attr('stroke-width', 0.5);
    xAxisGroup.selectAll('line').attr('stroke', '#334155').attr('stroke-width', 0.5);
    xAxisGroup
      .selectAll('text')
      .attr('fill', '#64748b')
      .style('font-family', 'monospace')
      .style('font-size', '7.5px');

    // Add minimal peak annotation label
    const peakPoint = points.reduce((prev, curr) => (prev.y > curr.y ? prev : curr));
    g.append('circle')
      .attr('cx', xScale(peakPoint.x))
      .attr('cy', yScale(peakPoint.y))
      .attr('r', 2)
      .attr('fill', '#f59e0b')
      .attr('opacity', 0.7);

    g.append('text')
      .attr('x', xScale(peakPoint.x))
      .attr('y', yScale(peakPoint.y) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .style('font-family', 'monospace')
      .style('font-size', '6.5px')
      .text(`Moyenne H(x) : ${mean.toFixed(2)}`);

    // Create interactive overlays
    const laserLine = g
      .append('line')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,2')
      .attr('y1', 0)
      .attr('y2', chartHeight)
      .attr('opacity', 0);

    const laserDot = g
      .append('circle')
      .attr('r', 3.5)
      .attr('fill', '#10b981')
      .attr('stroke', '#020617')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0)
      .attr('filter', 'url(#entropyGlow)');

    // Group for showing collapsed state
    const collapseGroup = g.append('g').attr('class', 'collapse-indicator');

    const updateCollapseVisuals = () => {
      collapseGroup.selectAll('*').remove();
      if (!collapsedState) return;

      const cx = xScale(collapsedState.x);
      const cy = yScale(collapsedState.y);

      // Collapsed static indicator
      collapseGroup
        .append('line')
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 1)
        .attr('x1', cx)
        .attr('y1', 0)
        .attr('x2', cx)
        .attr('y2', chartHeight)
        .attr('opacity', 0.6);

      collapseGroup
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 4)
        .attr('fill', '#f43f5e')
        .attr('stroke', '#020617')
        .attr('stroke-width', 1.5);

      collapseGroup
        .append('text')
        .attr('x', cx + 6)
        .attr('y', cy + 3)
        .attr('fill', '#fda4af')
        .style('font-family', 'monospace')
        .style('font-size', '7px')
        .style('font-weight', 'bold')
        .text(`Collapsé: ${collapsedState.x.toFixed(2)}`);
    };

    updateCollapseVisuals();

    // Catch hover/clicks
    const overlay = g
      .append('rect')
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    overlay
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const mouseXVal = xScale.invert(mx);
        
        // Find nearest point
        const index = d3.bisectLeft(points.map(p => p.x), mouseXVal);
        const selectedPt = points[Math.min(points.length - 1, Math.max(0, index))];

        if (selectedPt) {
          laserLine
            .attr('x1', xScale(selectedPt.x))
            .attr('x2', xScale(selectedPt.x))
            .attr('opacity', 1);

          laserDot
            .attr('cx', xScale(selectedPt.x))
            .attr('cy', yScale(selectedPt.y))
            .attr('opacity', 1);

          setHoveredState({
            x: selectedPt.x,
            y: selectedPt.y,
            density: selectedPt.y,
          });
        }
      })
      .on('mouseleave', () => {
        laserLine.attr('opacity', 0);
        laserDot.attr('opacity', 0);
        setHoveredState(null);
      })
      .on('click', (event) => {
        const [mx] = d3.pointer(event);
        const mouseXVal = xScale.invert(mx);
        
        const index = d3.bisectLeft(points.map(p => p.x), mouseXVal);
        const selectedPt = points[Math.min(points.length - 1, Math.max(0, index))];

        if (selectedPt) {
          const cx = xScale(selectedPt.x);
          const cy = yScale(selectedPt.y);

          // Animate a gorgeous quantum ripple using D3
          const ripple = g
            .append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', 1)
            .attr('fill', 'none')
            .attr('stroke', '#f43f5e')
            .attr('stroke-width', 2)
            .attr('opacity', 0.9);

          ripple
            .transition()
            .duration(600)
            .ease(d3.easeQuadOut)
            .attr('r', 25)
            .attr('stroke-width', 0.5)
            .attr('opacity', 0)
            .remove();

          setCollapsedState({ x: selectedPt.x, y: selectedPt.y });
        }
      });
  }, [points, maxDensity, collapsedState, branchId, mean]);

  return (
    <div className="space-y-1.5 p-2.5 bg-slate-900/40 border border-slate-950/80 rounded-lg" ref={containerRef}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide flex items-center gap-1">
          <Target className="w-3 h-3 text-indigo-400" />
          <span>Distribution d'entropie quantique</span>
        </span>
        <span className="text-[8px] font-mono text-slate-500 uppercase flex items-center gap-1">
          <Zap className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
          <span>Simulation interactive</span>
        </span>
      </div>

      <div className="relative">
        <svg ref={svgRef} className="block w-full overflow-visible" />
        
        {/* Floating live parameters / metrics overlay */}
        <div className="absolute right-1 top-0.5 flex flex-col items-end space-y-0.5 pointer-events-none font-mono text-[7px] text-slate-500">
          <span>H_mean: {mean.toFixed(3)}</span>
          <span>H_sigma: {sd.toFixed(3)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 pt-0.5 border-t border-slate-900/80">
        <span>Cohérence: {Math.max(10, Math.round((1 - mean) * 100))}%</span>
        {hoveredState ? (
          <span className="text-emerald-400 font-semibold bg-emerald-950/20 border border-emerald-900/30 px-1 rounded transition-all">
            H({hoveredState.x.toFixed(2)}) = {hoveredState.density.toFixed(3)} bits
          </span>
        ) : collapsedState ? (
          <span className="text-rose-400 font-semibold bg-rose-950/20 border border-rose-900/30 px-1 rounded animate-pulse">
            Collapse H(x) = {collapsedState.x.toFixed(2)}
          </span>
        ) : (
          <span className="text-slate-400 italic">Cliquez sur la courbe pour mesurer un état</span>
        )}
      </div>
    </div>
  );
};
