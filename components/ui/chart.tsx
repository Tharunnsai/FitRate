"use client"

import * as React from "react"
import { AreaChart, BarChart, LineChart, PieChart } from "recharts"

import { cn } from "@/lib/utils"

const Chart = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("recharts-wrapper", className)}
    {...props}
  />
))
Chart.displayName = "Chart"

const ChartArea = React.forwardRef<
  React.ComponentRef<typeof AreaChart>,
  React.ComponentPropsWithoutRef<typeof AreaChart>
>(({ className, children, ...props }, ref) => (
  <AreaChart
    ref={ref}
    className={cn("", className)}
    {...props}
  >
    {children}
  </AreaChart>
))
ChartArea.displayName = "ChartArea"

const ChartBar = React.forwardRef<
  React.ComponentRef<typeof BarChart>,
  React.ComponentPropsWithoutRef<typeof BarChart>
>(({ className, children, ...props }, ref) => (
  <BarChart
    ref={ref}
    className={cn("", className)}
    {...props}
  >
    {children}
  </BarChart>
))
ChartBar.displayName = "ChartBar"

const ChartLine = React.forwardRef<
  React.ComponentRef<typeof LineChart>,
  React.ComponentPropsWithoutRef<typeof LineChart>
>(({ className, children, ...props }, ref) => (
  <LineChart
    ref={ref}
    className={cn("", className)}
    {...props}
  >
    {children}
  </LineChart>
))
ChartLine.displayName = "ChartLine"

const ChartPie = React.forwardRef<
  React.ComponentRef<typeof PieChart>,
  React.ComponentPropsWithoutRef<typeof PieChart>
>(({ className, children, ...props }, ref) => (
  <PieChart
    ref={ref}
    className={cn("", className)}
    {...props}
  >
    {children}
  </PieChart>
))
ChartPie.displayName = "ChartPie"

export { Chart, ChartArea, ChartBar, ChartLine, ChartPie }
