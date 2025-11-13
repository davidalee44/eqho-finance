import { DynamicFinancialInsights } from '@/components/DynamicFinancialInsights';
import FinancialReport from '@/components/FinancialReport';
import { MRRMetrics } from '@/components/MRRMetrics';
import { OctoberRevenueBreakdown } from '@/components/OctoberRevenueBreakdown';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PercentageInput } from '@/components/ui/percentage-input';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ValidatedMetrics } from '@/components/ValidatedMetrics';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowUp, BarChart, ChevronLeft, ChevronRight, Code, DollarSign, GripVertical, Target, TrendingUp, Users, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useDraggableCards } from './hooks/useDraggableCards';
import UserProfile from './components/UserProfile';

// Storage key for financial model variables
const STORAGE_KEY = 'financial-model-variables';

// Default values
const DEFAULT_VARIABLES = {
  septRevenue: 90202,
  cmgr: 19.9, // CMGR Jan-Oct 2025 actual
  targetOpex: 190000,
  targetGrossMargin: 70,
  startingCash: 500000,
};

// Interactive Financial Model Component
const FinancialModelSlide = () => {
  // Load initial state from localStorage or use defaults
  const loadSavedVariables = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle any missing keys
        return { ...DEFAULT_VARIABLES, ...parsed };
      }
    } catch (error) {
      console.error('Error loading saved variables:', error);
    }
    return DEFAULT_VARIABLES;
  };

  // Model Variables (Editable)
  const [variables, setVariables] = useState(loadSavedVariables);
  const [lastCalculated, setLastCalculated] = useState(new Date());
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Save to localStorage whenever variables change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(variables));
    } catch (error) {
      console.error('Error saving variables:', error);
    }
  }, [variables]);

  const updateVariable = (key, value) => {
    // Handle both string and number values
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setVariables(prev => ({ ...prev, [key]: numValue }));
  };

  const recalculate = () => {
    setIsRecalculating(true);
    setLastCalculated(new Date());
    // Force a re-render by updating state
    setVariables(prev => ({ ...prev }));
    
    // Show success animation
    setTimeout(() => {
      setIsRecalculating(false);
    }, 800);
  };

  const resetToDefaults = () => {
    setVariables(DEFAULT_VARIABLES);
    setLastCalculated(new Date());
    setShowResetConfirm(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_VARIABLES));
  };

  // Calculate projections based on variables
  const calculateProjections = () => {
    const growthRate = 1 + (variables.cmgr / 100);
    const months = [];
    let cash = variables.startingCash;

    for (let m = 1; m <= 12; m++) {
      const revenue = variables.septRevenue * Math.pow(growthRate, m);
      // Calculate COGS to achieve target gross margin
      // Formula: COGS = Revenue × (1 - TargetGrossMargin%)
      // This ensures: Gross Margin = (Revenue - COGS) / Revenue = TargetGrossMargin%
      const cogs = revenue * (1 - variables.targetGrossMargin / 100);
      const grossProfit = revenue - cogs;
      
      // Growth-focused OpEx plan (maintain higher spend for growth)
      const currentOpex = 150286; // Sep actual
      const targetFixed = variables.targetOpex - cogs;
      
      // Ramp up to target OpEx over first 3 months
      let fixedOpex;
      if (m <= 3) {
        const monthlyIncrease = (targetFixed - (currentOpex - cogs)) / 3;
        fixedOpex = (currentOpex - cogs) + (monthlyIncrease * m);
      } else {
        fixedOpex = targetFixed;
      }
      
      const totalOpex = cogs + fixedOpex;
      const noi = revenue - totalOpex;
      cash += noi;

      months.push({
        month: m,
        monthLabel: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'][m-1],
        revenue,
        cogs,
        grossProfit,
        grossMargin: (grossProfit / revenue * 100),
        fixedOpex,
        totalOpex,
        noi,
        cash,
        profitable: noi > 0,
        cfPositive: cash > variables.startingCash
      });
    }

    return months;
  };

  const projections = calculateProjections();
  const q1 = projections.slice(0, 3);
  const q2 = projections.slice(3, 6);
  const q3 = projections.slice(6, 9);
  const q4 = projections.slice(9, 12);

  const breakeven = projections.find(m => m.profitable);
  const cfPositive = projections.find(m => m.cfPositive);
  
  // Calculate actual burn: lowest cash point relative to starting cash
  const lowestCash = Math.min(...projections.map(m => m.cash));
  const totalBurn = variables.startingCash - lowestCash;
  
  // Alternative: sum of negative NOI until breakeven
  const burnUntilBreakeven = breakeven 
    ? projections.slice(0, breakeven.month - 1).reduce((sum, m) => sum + (m.noi < 0 ? Math.abs(m.noi) : 0), 0)
    : projections.reduce((sum, m) => sum + (m.noi < 0 ? Math.abs(m.noi) : 0), 0);

  return (
    <div className="mono-theme space-y-4 p-6 rounded-lg">
      {/* Variables Panel */}
      <Accordion type="multiple" defaultValue={["assumptions"]} className="space-y-4">
        <AccordionItem value="assumptions">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="text-base">Model Assumptions (Click to Edit)</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="septRevenue" className="text-xs font-medium">September Revenue</Label>
                    <CurrencyInput
                      id="septRevenue"
                      value={variables.septRevenue}
                      onChange={(value) => updateVariable('septRevenue', value)}
                      className="h-9 text-sm"
                      placeholder="90,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cmgr" className="text-xs font-medium">CMGR (Monthly Growth Rate)</Label>
                    <PercentageInput
                      id="cmgr"
                      value={variables.cmgr}
                      onChange={(value) => updateVariable('cmgr', value)}
                      className="h-9 text-sm"
                      placeholder="22.8"
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetOpex" className="text-xs font-medium">Target Monthly OpEx</Label>
                    <CurrencyInput
                      id="targetOpex"
                      value={variables.targetOpex}
                      onChange={(value) => updateVariable('targetOpex', value)}
                      className="h-9 text-sm"
                      placeholder="190,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetGrossMargin" className="text-xs font-medium">Target Gross Margin</Label>
                    <PercentageInput
                      id="targetGrossMargin"
                      value={variables.targetGrossMargin}
                      onChange={(value) => updateVariable('targetGrossMargin', value)}
                      className="h-9 text-sm"
                      placeholder="70.0"
                      step={0.1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startingCash" className="text-xs font-medium">Starting Cash</Label>
                    <CurrencyInput
                      id="startingCash"
                      value={variables.startingCash}
                      onChange={(value) => updateVariable('startingCash', value)}
                      className="h-9 text-sm"
                      placeholder="500,000"
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs text-green-700 font-medium mb-2">Breakeven Month</p>
                    <p className="text-2xl font-bold text-green-700">{breakeven ? `M${breakeven.month}` : 'N/A'}</p>
                    <p className="text-xs text-green-600 mt-1">{breakeven ? `$${(breakeven.revenue / 1000).toFixed(0)}K MRR` : ''}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium mb-2">CF Positive</p>
                    <p className="text-2xl font-bold text-blue-700">{cfPositive ? `M${cfPositive.month}` : 'N/A'}</p>
                    <p className="text-xs text-blue-600 mt-1">{cfPositive ? `$${(cfPositive.cash / 1000).toFixed(0)}K` : ''}</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <p className="text-xs text-purple-700 font-medium mb-2">Year-End Cash</p>
                    <p className="text-2xl font-bold text-purple-700">${(projections[11].cash / 1000000).toFixed(2)}M</p>
                    <p className="text-xs text-purple-600 mt-1">M12 MRR: ${(projections[11].revenue / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Control Panel */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground">Last Calculated</span>
                <span className="text-sm font-mono">{lastCalculated.toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showResetConfirm ? (
                <>
                  <span className="text-sm text-muted-foreground mr-2">Reset to defaults?</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={resetToDefaults}
                  >
                    Confirm Reset
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant={isRecalculating ? "default" : "outline"}
                    size="sm"
                    onClick={recalculate}
                    className="gap-2"
                    disabled={isRecalculating}
                  >
                    <Zap className={cn("w-4 h-4", isRecalculating && "animate-pulse")} />
                    {isRecalculating ? "Calculating..." : "Recalculate"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={isRecalculating}
                  >
                    Reset to Defaults
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Detail Table */}
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="monthly">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="text-base">Month-by-Month Projection</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-semibold">Month</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Revenue</TableHead>
                        <TableHead className="text-xs font-semibold text-right">COGS</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Gross Profit</TableHead>
                        <TableHead className="text-xs font-semibold text-right">GM%</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Fixed OpEx</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Total OpEx</TableHead>
                        <TableHead className="text-xs font-semibold text-right">NOI</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Cash</TableHead>
                        <TableHead className="text-xs font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projections.map((month) => (
                        <TableRow 
                          key={month.month} 
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            month.profitable ? 'bg-green-50/50' : month.cfPositive ? 'bg-blue-50/50' : ''
                          )}
                        >
                          <TableCell className="text-xs font-medium">{month.monthLabel}</TableCell>
                          <TableCell className="text-xs text-right font-mono">${(month.revenue / 1000).toFixed(0)}K</TableCell>
                          <TableCell className="text-xs text-right font-mono">${(month.cogs / 1000).toFixed(0)}K</TableCell>
                          <TableCell className="text-xs text-right font-mono">${(month.grossProfit / 1000).toFixed(0)}K</TableCell>
                          <TableCell className="text-xs text-right font-mono">{month.grossMargin.toFixed(1)}%</TableCell>
                          <TableCell className="text-xs text-right font-mono">${(month.fixedOpex / 1000).toFixed(0)}K</TableCell>
                          <TableCell className="text-xs text-right font-mono">${(month.totalOpex / 1000).toFixed(0)}K</TableCell>
                          <TableCell className={cn("text-xs text-right font-mono font-semibold", month.noi > 0 ? "text-green-600" : "text-red-600")}>
                            ${(month.noi / 1000).toFixed(0)}K
                          </TableCell>
                          <TableCell className={cn("text-xs text-right font-mono font-semibold", month.cash > variables.startingCash ? "text-green-600" : month.cash > 100000 ? "" : "text-orange-600")}>
                            ${(month.cash / 1000).toFixed(0)}K
                          </TableCell>
                          <TableCell className="text-xs">
                            {month.profitable ? 'Profit' : month.cfPositive ? 'CF+' : month.cash < 100000 ? (
                              <span className="flex items-center gap-1 text-orange-600">
                                <AlertTriangle className="h-3 w-3" />
                                Low
                              </span>
                            ) : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Quarterly Summary */}
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="quarterly">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="text-base">Quarterly Summary</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Q1 (Oct-Dec)', months: q1 },
                    { label: 'Q2 (Jan-Mar)', months: q2 },
                    { label: 'Q3 (Apr-Jun)', months: q3 },
                    { label: 'Q4 (Jul-Sep)', months: q4 }
                  ].map(({ label, months }) => {
                    const qRev = months.reduce((sum, m) => sum + m.revenue, 0);
                    const qOpex = months.reduce((sum, m) => sum + m.totalOpex, 0);
                    const qNOI = months.reduce((sum, m) => sum + m.noi, 0);
                    const endingCash = months[months.length - 1].cash;
                    
                    return (
                      <div key={label} className="p-4 border rounded-lg space-y-3 hover:shadow-md transition-shadow">
                        <h3 className="font-semibold text-sm text-center pb-2 border-b">{label}</h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Revenue:</span>
                            <span className="font-medium font-mono">${(qRev / 1000).toFixed(0)}K</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">OpEx:</span>
                            <span className="font-medium font-mono">${(qOpex / 1000).toFixed(0)}K</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">NOI:</span>
                            <span className={cn("font-semibold font-mono", qNOI > 0 ? "text-green-600" : "text-red-600")}>
                              ${(qNOI / 1000).toFixed(0)}K
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-muted-foreground font-medium">End Cash:</span>
                            <span className="font-bold font-mono">${(endingCash / 1000).toFixed(0)}K</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* OpEx Optimization Plan */}
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="opexPlan">
          <Card>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <CardTitle className="text-base">OpEx Optimization Roadmap</CardTitle>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent>
                <Tabs defaultValue="phase1" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="phase1" className="text-xs">Phase 1 (M1-3)</TabsTrigger>
                    <TabsTrigger value="phase2" className="text-xs">Phase 2 (M4-12)</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="phase1" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                        <h4 className="text-sm font-semibold mb-2 text-blue-900">Sales & Marketing (+$20K/mo)</h4>
                        <ul className="space-y-1 text-xs text-blue-700">
                          <li className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span>Add 2 SDRs to accelerate pipeline</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span>Increase marketing spend 2x</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span>Launch partner channel program</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span>Invest in demand generation</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                        <h4 className="text-sm font-semibold mb-2 text-purple-900">Product & Engineering (+$15K/mo)</h4>
                        <ul className="space-y-1 text-xs text-purple-700">
                          <li className="flex items-center gap-2">
                            <Code className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                            <span>Add senior engineers for faster velocity</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Code className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                            <span>Expand AI/ML capabilities</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Code className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                            <span>Build enterprise features faster</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Code className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                            <span>Invest in infrastructure scalability</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-green-50/50 border border-green-100">
                        <h4 className="text-sm font-semibold mb-2 text-green-900">Customer Success (+$10K/mo)</h4>
                        <ul className="space-y-1 text-xs text-green-700">
                          <li className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            <span>Scale CS team for retention</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            <span>Build customer education program</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            <span>Proactive account management</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            <span>Expansion revenue initiatives</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold">Growth-Focused OpEx:</span>
                          <span className="text-lg font-bold text-blue-600">$150K → $190K</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">+27% investment in growth over 3 months</p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="phase2" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-orange-50/50 border border-orange-100">
                        <h4 className="text-sm font-semibold mb-2 text-orange-900">Maintain Growth Spend</h4>
                        <ul className="space-y-1 text-xs text-orange-700">
                          <li className="flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                            <span>Hold OpEx at $190K for growth</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                            <span>COGS scales with revenue (30%)</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                            <span>Prioritize revenue growth</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <DollarSign className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                            <span>Track unit economics weekly</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-green-50/50 border border-green-100">
                        <h4 className="text-sm font-semibold mb-2 text-green-900">Accelerate Revenue</h4>
                        <ul className="space-y-1 text-xs text-green-700">
                          <li className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            <span>Target 25%+ CMGR</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            <span>Expand into new segments</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            <span>Launch upsell initiatives</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            <span>Build strategic partnerships</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                        <h4 className="text-sm font-semibold mb-2 text-blue-900">Efficiency Gains</h4>
                        <ul className="space-y-1 text-xs text-blue-700">
                          <li className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span>Automation reduces CAC over time</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span>Platform improvements reduce support load</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span>Scale benefits emerge in Q3/Q4</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            <span>Margin expansion through volume</span>
                          </li>
                        </ul>
                      </div>
                      
                      <div className="p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold">Growth Investment:</span>
                          <span className="text-lg font-bold text-amber-700">${(totalBurn / 1000).toFixed(0)}K Burn</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Invest in growth, reach scale faster</p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>

      {/* Strategy Callout */}
      <Card className="border-2 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
            <h3 className="text-base font-bold text-blue-900 mb-2">Growth-Focused Strategy</h3>
            <p className="text-sm text-blue-800 mb-3">
              Rather than aggressive cost-cutting, this model invests <span className="font-bold text-blue-900">${(totalBurn / 1000).toFixed(0)}K</span> of the $500K raise into accelerating growth. 
              The strategy prioritizes reaching scale faster while maintaining strong unit economics.
            </p>
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white/80 border border-blue-200">
                <p className="text-blue-600 font-medium mb-1">Total Burn</p>
                <p className="font-bold text-blue-900 text-lg">${(totalBurn / 1000).toFixed(0)}K</p>
                <p className="text-xs text-muted-foreground mt-0.5">To lowest point</p>
              </div>
              <div className="p-3 rounded-lg bg-white/80 border border-purple-200">
                <p className="text-purple-600 font-medium mb-1">Runway</p>
                <p className="font-bold text-purple-900 text-lg">8-9 mo</p>
              </div>
              <div className="p-3 rounded-lg bg-white/80 border border-green-200">
                <p className="text-green-600 font-medium mb-1">Exit MRR</p>
                <p className="font-bold text-green-900 text-lg">$250K+</p>
              </div>
              <div className="p-3 rounded-lg bg-white/80 border border-amber-200">
                <p className="text-amber-600 font-medium mb-1">Reserve</p>
                <p className="font-bold text-amber-900 text-lg">$100K</p>
              </div>
            </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-3 bg-blue-50/50">
            <CardTitle className="text-sm">Baseline (Sept 2025)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs pt-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-medium font-mono">$90K</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Gross Margin:</span>
              <span className="font-medium font-mono">69.1%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Current OpEx:</span>
              <span className="font-medium font-mono">$150K</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-1">
              <span className="font-medium">Monthly Burn:</span>
              <span className="text-red-600 font-bold font-mono">-$88K</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardHeader className="pb-3 bg-purple-50/50">
            <CardTitle className="text-sm">Growth Model (M3+)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs pt-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">CMGR Target:</span>
              <span className="font-medium font-mono">{variables.cmgr.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Target GM:</span>
              <span className="font-medium font-mono">{variables.targetGrossMargin}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Growth OpEx:</span>
              <span className="font-medium font-mono">${(variables.targetOpex / 1000).toFixed(0)}K</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-1">
              <span className="font-medium">OpEx Increase:</span>
              <span className="text-blue-600 font-bold font-mono">+27%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="pb-3 bg-green-50/50">
            <CardTitle className="text-sm">Investment Outcome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs pt-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Initial Capital:</span>
              <span className="font-medium font-mono">${(variables.startingCash / 1000).toFixed(0)}K</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Breakeven:</span>
              <span className="font-medium font-mono">Month {breakeven ? breakeven.month : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">CF Positive:</span>
              <span className="font-medium font-mono">Month {cfPositive ? cfPositive.month : 'N/A'}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-1">
              <span className="font-medium">Year-End Cash:</span>
              <span className="text-green-600 font-bold font-mono">${(projections[11].cash / 1000000).toFixed(2)}M</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dynamic AI-Powered Insights */}
      <DynamicFinancialInsights 
        projections={projections}
        variables={variables}
        breakeven={breakeven}
        cfPositive={cfPositive}
      />

      {/* Investment Strategy Summary */}
      <Card className="border-2 border-green-200">
        <CardHeader className="pb-3 bg-green-50/50">
          <CardTitle className="text-sm text-green-900">Investment Strategy Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="space-y-2 p-3 rounded-lg bg-green-100/60 border border-green-300">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-green-600" />
              <p className="font-bold text-green-900">Recommended: $500K</p>
            </div>
            <p className="text-green-800">• Burn ${(totalBurn / 1000).toFixed(0)}K to lowest point (Month {projections.findIndex(m => m.cash === lowestCash) + 1})</p>
            <p className="text-green-800">• Keep $100K reserve for contingency</p>
            <p className="text-green-800">• Focus on growth, not cost-cutting</p>
            <p className="text-green-800">• Reach $250K+ MRR at breakeven</p>
          </div>
          <Separator />
          <div className="space-y-2 p-3 rounded-lg bg-white/60">
            <div className="flex items-center gap-2 mb-2">
              <BarChart className="h-4 w-4 text-amber-600" />
              <p className="font-semibold text-amber-800">Key Outcomes</p>
            </div>
            <p className="text-amber-700">• 8-9 month runway to profitability</p>
            <p className="text-amber-700">• 3x revenue growth (90K → 250K+)</p>
            <p className="text-amber-700">• Team scales appropriately</p>
            <p className="text-amber-700">• Exit with strong momentum</p>
          </div>
          <div className="p-2 rounded-lg bg-blue-100 text-center">
            <p className="font-bold text-blue-900">Better than being a &ldquo;cost-cutting hero&rdquo;</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Team Compensation Storage
const TEAM_STORAGE_KEY = 'team-compensation-data';

// Default team structure
// Actual team data from QuickBooks (October 2025)
// Categorized by payment amounts and likely role responsibilities
const DEFAULT_TEAM = {
  executive: [
    { name: 'David Lee', type: 'founder', monthlyPayout: 2340, role: 'CEO' },
  ],
  productEngineering: [
    { name: 'Caleb Gorden', type: 'contractor', monthlyPayout: 4167, role: 'Lead Engineer / CTO' },
    { name: 'Daniel McConnell', type: 'contractor', monthlyPayout: 3750, role: 'Senior Full-Stack Engineer' },
    { name: 'Kyle Nadauld', type: 'contractor', monthlyPayout: 3750, role: 'Senior Full-Stack Engineer' },
    { name: 'Tyler Karren', type: 'contractor', monthlyPayout: 3360, role: 'Full-Stack Engineer' },
    { name: 'Jaxon Ball', type: 'contractor', monthlyPayout: 2820, role: 'Backend Engineer' },
    { name: 'Ben Harward', type: 'contractor', monthlyPayout: 2414, role: 'Frontend Engineer' },
  ],
  salesMarketing: [
    { name: 'Cooper Schow', type: 'contractor', monthlyPayout: 2880, role: 'Sales / Marketing Lead' },
  ],
  customerSuccess: [
    { name: 'Bethany Rene\' Meyer', type: 'contractor', monthlyPayout: 2266, role: 'Customer Success Manager' },
    { name: 'Celine Taylor', type: 'contractor', monthlyPayout: 1902, role: 'Support Specialist' },
    { name: 'Jesse Plumb', type: 'contractor', monthlyPayout: 1784, role: 'Technical Support' },
  ],
  operations: [
    { name: 'Cameron Lee', type: 'contractor', monthlyPayout: 240, role: 'Admin / Part-Time Ops' },
  ],
};

// Predefined roles by department
const DEPARTMENT_ROLES = {
  executive: [
    'CEO / Founder',
    'CTO',
    'CFO',
    'COO',
    'President',
    'VP Engineering',
    'VP Sales',
    'VP Product',
    'VP Operations',
    'Chief Revenue Officer',
  ],
  productEngineering: [
    'Lead Engineer / Tech Lead',
    'Senior Full-Stack Engineer',
    'Senior Backend Engineer',
    'Senior Frontend Engineer',
    'Full-Stack Engineer',
    'Backend Engineer',
    'Frontend Engineer',
    'Mobile Engineer',
    'DevOps Engineer',
    'QA Engineer',
    'Data Engineer',
    'ML Engineer',
    'Product Manager',
    'UX/UI Designer',
  ],
  salesMarketing: [
    'VP Sales',
    'Sales Director',
    'Account Executive',
    'Sales Development Rep (SDR)',
    'Business Development Manager',
    'Marketing Director',
    'Marketing Manager',
    'Content Marketing Manager',
    'Growth Manager',
    'Demand Gen Manager',
    'Social Media Manager',
  ],
  customerSuccess: [
    'Head of Customer Success',
    'Customer Success Manager',
    'Account Manager',
    'Support Specialist',
    'Technical Support Engineer',
    'Onboarding Specialist',
    'Customer Experience Manager',
  ],
  operations: [
    'COO',
    'Operations Manager',
    'Office Manager',
    'Finance Manager',
    'Controller',
    'HR Manager',
    'Recruiter',
    'Administrative Assistant',
    'Executive Assistant',
    'Coordinator',
  ],
};

// Team Compensation Component
const TeamCompensationSlide = () => {
  const loadSavedTeam = () => {
    try {
      const saved = localStorage.getItem(TEAM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults
        return {
          salesMarketing: parsed.salesMarketing || DEFAULT_TEAM.salesMarketing,
          productEngineering: parsed.productEngineering || DEFAULT_TEAM.productEngineering,
          customerSuccess: parsed.customerSuccess || DEFAULT_TEAM.customerSuccess,
          operations: parsed.operations || DEFAULT_TEAM.operations,
          executive: parsed.executive || DEFAULT_TEAM.executive,
        };
      }
    } catch (error) {
      console.error('Error loading saved team:', error);
    }
    return DEFAULT_TEAM;
  };

  const [team, setTeam] = useState(loadSavedTeam);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkAddData, setBulkAddData] = useState({
    name: '',
    department: 'productEngineering',
    role: '',
    type: 'contractor',
    monthlyPayout: ''
  });

  // Save to localStorage whenever team changes
  useEffect(() => {
    try {
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
    } catch (error) {
      console.error('Error saving team:', error);
    }
  }, [team]);

  const updateTeamMember = (department, index, field, value) => {
    setTeam(prev => ({
      ...prev,
      [department]: prev[department].map((member, i) =>
        i === index ? { ...member, [field]: field === 'monthlyPayout' ? parseFloat(value) || 0 : value } : member
      ),
    }));
  };

  const addTeamMember = (department) => {
    setTeam(prev => ({
      ...prev,
      [department]: [...prev[department], { name: '', role: '', type: 'contractor', monthlyPayout: 0 }],
    }));
  };

  const removeTeamMember = (department, index) => {
    setTeam(prev => ({
      ...prev,
      [department]: prev[department].filter((_, i) => i !== index),
    }));
  };

  const clearAllTeam = () => {
    if (confirm('Are you sure you want to clear all team members? This cannot be undone.')) {
      setTeam({
        executive: [],
        productEngineering: [],
        salesMarketing: [],
        customerSuccess: [],
        operations: []
      });
    }
  };

  const resetToQBDefaults = () => {
    if (confirm('Reset to QuickBooks data from Nov 6th payroll? This will replace all current data.')) {
      setTeam(DEFAULT_TEAM);
    }
  };

  const calculateDepartmentTotal = (members) => {
    return members.reduce((sum, member) => sum + (member.monthlyPayout || 0), 0);
  };

  const calculateGrandTotal = () => {
    return Object.values(team).reduce((sum, members) => sum + calculateDepartmentTotal(members), 0);
  };

  const handleBulkAdd = () => {
    if (!bulkAddData.name || !bulkAddData.role || !bulkAddData.monthlyPayout) {
      alert('Please fill in all fields');
      return;
    }
    
    const newMember = {
      name: bulkAddData.name,
      role: bulkAddData.role,
      type: bulkAddData.type,
      monthlyPayout: parseFloat(bulkAddData.monthlyPayout) || 0
    };

    setTeam(prev => ({
      ...prev,
      [bulkAddData.department]: [...prev[bulkAddData.department], newMember]
    }));

    // Reset form (keep department selected)
    setBulkAddData({
      name: '',
      department: bulkAddData.department,
      role: '',
      type: 'contractor',
      monthlyPayout: ''
    });
  };

  const handleExcelUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        
        // Parse CSV/TSV format (Excel exported as CSV)
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header row, process data rows
        let imported = 0;
        const newTeamMembers = {
          executive: [],
          productEngineering: [],
          salesMarketing: [],
          customerSuccess: [],
          operations: []
        };

        for (let i = 1; i < lines.length; i++) {
          // Handle both comma and tab delimiters
          const parts = lines[i].includes('\t') 
            ? lines[i].split('\t') 
            : lines[i].split(',');
          
          if (parts.length >= 2) {
            const name = parts[0]?.trim().replace(/^"|"$/g, '');
            const amountStr = parts[1]?.trim().replace(/[$,"\s]/g, '');
            const amount = parseFloat(amountStr);
            
            if (name && !isNaN(amount) && amount > 0) {
              // Try to match existing team member to preserve role
              let foundMember = null;
              for (const dept of Object.keys(team)) {
                foundMember = team[dept].find(m => 
                  m.name.toLowerCase().includes(name.toLowerCase()) ||
                  name.toLowerCase().includes(m.name.toLowerCase())
                );
                if (foundMember) break;
              }

              const newMember = {
                name,
                role: foundMember?.role || 'Team Member',
                type: foundMember?.type || 'contractor',
                monthlyPayout: amount
              };

              // Categorize by existing role or default to operations
              const dept = foundMember 
                ? Object.keys(team).find(d => team[d].includes(foundMember))
                : 'operations';
              
              newTeamMembers[dept].push(newMember);
              imported++;
            }
          }
        }

        if (imported > 0) {
          // Merge with existing team (update amounts, keep roles)
          setTeam(prev => ({
            executive: [...prev.executive, ...newTeamMembers.executive],
            productEngineering: [...prev.productEngineering, ...newTeamMembers.productEngineering],
            salesMarketing: [...prev.salesMarketing, ...newTeamMembers.salesMarketing],
            customerSuccess: [...prev.customerSuccess, ...newTeamMembers.customerSuccess],
            operations: [...prev.operations, ...newTeamMembers.operations]
          }));
          
          alert(`✅ Successfully imported ${imported} team member(s) from QuickBooks Excel!`);
        } else {
          alert('⚠️ No valid data found. Please ensure your Excel file has Name and Amount columns.');
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('❌ Error reading file. Please ensure it\'s a valid CSV/Excel export from QuickBooks.');
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const departmentConfig = [
    { key: 'executive', label: 'Executive', color: 'purple' },
    { key: 'salesMarketing', label: 'Sales & Marketing', color: 'blue' },
    { key: 'productEngineering', label: 'Product & Engineering', color: 'green' },
    { key: 'customerSuccess', label: 'Customer Success', color: 'orange' },
    { key: 'operations', label: 'Operations', color: 'gray' },
  ];

  return (
    <div className="mono-theme space-y-4 p-6 rounded-lg">
      {/* QuickBooks Data Banner */}
      <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <CardContent className="py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  📊 Single Payroll Snapshot
                </Badge>
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  October 2025 payroll cycle (Nov 6th run)
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-700 dark:text-blue-300">Total Payroll (Single Cycle)</p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100 font-mono">
                  $124,272
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {Object.values(team).flat().length} contractors shown (${calculateGrandTotal().toLocaleString()} in this sample)
                </p>
              </div>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic">
              ⚠️ Note: This represents a single payroll run from Nov 6, 2025. Multiple payroll cycles occurred in October. 
              These amounts are per-contractor for this specific pay period, not monthly totals.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Add Team Member Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Quick Add Team Member</CardTitle>
            <div className="flex gap-2">
              <label htmlFor="excel-upload">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('excel-upload').click();
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Upload QB Excel
                </Button>
              </label>
              <input
                id="excel-upload"
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={handleExcelUpload}
                className="hidden"
              />
              <Button
                variant={showBulkAdd ? "secondary" : "default"}
                size="sm"
                onClick={() => setShowBulkAdd(!showBulkAdd)}
              >
                {showBulkAdd ? 'Cancel' : '+ Add Person'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Upload QuickBooks payroll export (CSV/Excel with Name & Amount columns) or add individually
          </p>
        </CardHeader>
        {showBulkAdd && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Row 1: Department and Role */}
              <div className="space-y-1">
                <Label htmlFor="bulk-department" className="text-xs font-medium">1. Department</Label>
                <select
                  id="bulk-department"
                  value={bulkAddData.department}
                  onChange={(e) => setBulkAddData(prev => ({ ...prev, department: e.target.value, role: '' }))}
                  className="h-9 text-sm border rounded px-3 w-full bg-background"
                >
                  {departmentConfig.map(dept => (
                    <option key={dept.key} value={dept.key}>{dept.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bulk-role" className="text-xs font-medium">2. Role</Label>
                <select
                  id="bulk-role"
                  value={bulkAddData.role}
                  onChange={(e) => setBulkAddData(prev => ({ ...prev, role: e.target.value }))}
                  className="h-9 text-sm border rounded px-3 w-full bg-background"
                  disabled={!bulkAddData.department}
                >
                  <option value="">Select a role...</option>
                  {DEPARTMENT_ROLES[bulkAddData.department]?.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              
              {/* Row 2: Name and Type */}
              <div className="space-y-1">
                <Label htmlFor="bulk-name" className="text-xs font-medium">3. Name</Label>
                <Input
                  id="bulk-name"
                  value={bulkAddData.name}
                  onChange={(e) => setBulkAddData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bulk-type" className="text-xs font-medium">4. Type</Label>
                <select
                  id="bulk-type"
                  value={bulkAddData.type}
                  onChange={(e) => setBulkAddData(prev => ({ ...prev, type: e.target.value }))}
                  className="h-9 text-sm border rounded px-3 w-full bg-background"
                >
                  <option value="founder">Founder</option>
                  <option value="employee">Employee</option>
                  <option value="contractor">Contractor</option>
                </select>
              </div>
              
              {/* Row 3: Payroll Amount */}
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="bulk-amount" className="text-xs font-medium">5. Monthly Payroll</Label>
                <CurrencyInput
                  id="bulk-amount"
                  value={bulkAddData.monthlyPayout}
                  onChange={(value) => setBulkAddData(prev => ({ ...prev, monthlyPayout: value }))}
                  className="h-9 text-sm"
                  placeholder="5000"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="text-sm text-muted-foreground">
                {bulkAddData.role && (
                  <span>
                    Adding <strong className="text-foreground">{bulkAddData.role}</strong> to{' '}
                    <strong className="text-foreground">
                      {departmentConfig.find(d => d.key === bulkAddData.department)?.label}
                    </strong>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkAdd(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleBulkAdd}
                  size="sm"
                  disabled={!bulkAddData.name || !bulkAddData.role || !bulkAddData.monthlyPayout}
                >
                  Add to Team
                </Button>
              </div>
            </div>

            <Separator />

            {/* Help Section for Excel Upload */}
            <Accordion type="single" collapsible>
              <AccordionItem value="excel-help" className="border rounded-lg px-3">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <span className="text-xs font-medium">📤 QuickBooks Excel Upload Instructions</span>
                </AccordionTrigger>
                <AccordionContent className="pb-2 space-y-3">
                  <div className="text-xs space-y-2">
                    <p className="font-medium">Expected Format (CSV or Excel):</p>
                    <div className="bg-muted p-2 rounded font-mono text-xs">
                      Name, Amount<br/>
                      John Doe, 5000<br/>
                      Jane Smith, 4500<br/>
                      Bob Wilson, 3000
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="font-medium mb-1">How it works:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                        <li>Matches names with existing team members to preserve roles</li>
                        <li>New names default to "Team Member" role (edit after import)</li>
                        <li>Unmatched entries go to Operations department</li>
                        <li>Accepts CSV, TSV, or Excel exports</li>
                      </ul>
                    </div>
                    
                    <div>
                      <p className="font-medium mb-1">Steps:</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                        <li>Export contractor report from QuickBooks</li>
                        <li>Save as CSV or keep as Excel</li>
                        <li>Click "Upload QB Excel" button</li>
                        <li>Select your file</li>
                        <li>Review imported data and assign roles</li>
                      </ol>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        )}
      </Card>

      {/* Team Management Controls */}
      <Card className="border-gray-200 bg-gray-50/50">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <strong>{Object.values(team).flat().length}</strong> team members • 
              <strong className="ml-2">${calculateGrandTotal().toLocaleString()}</strong> total payroll
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToQBDefaults}
              >
                Reset to QB Defaults
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllTeam}
                className="text-destructive hover:text-destructive"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {departmentConfig.map(({ key, label, color }) => {
          const members = team[key] || [];
          const deptTotal = calculateDepartmentTotal(members);
          const colorClasses = {
            purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-800' },
            blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-800' },
            green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', badge: 'bg-green-100 text-green-800' },
            orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', badge: 'bg-orange-100 text-orange-800' },
            gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900', badge: 'bg-gray-100 text-gray-800' },
          };
          const colors = colorClasses[color];

          return (
            <Card key={key} className={`${colors.border} border-2`}>
              <CardHeader className={`${colors.bg} pb-3`}>
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-sm ${colors.text}`}>{label}</CardTitle>
                  <Badge className={colors.badge}>
                    ${(deptTotal / 1000).toFixed(1)}K
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Name</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs text-right">Payroll Amount</TableHead>
                      <TableHead className="text-xs w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member, index) => (
                      <TableRow key={index}>
                        <TableCell className="p-2">
                          <Input
                            value={member.name}
                            onChange={(e) => updateTeamMember(key, index, 'name', e.target.value)}
                            placeholder="Name"
                            className="h-7 text-xs font-mono"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <select
                            value={member.role || ''}
                            onChange={(e) => updateTeamMember(key, index, 'role', e.target.value)}
                            className="h-7 text-xs border rounded px-2 w-full bg-background"
                          >
                            <option value="">Select role...</option>
                            {DEPARTMENT_ROLES[key]?.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="p-2">
                          <select
                            value={member.type}
                            onChange={(e) => updateTeamMember(key, index, 'type', e.target.value)}
                            className="h-7 text-xs font-mono border rounded px-2 w-full bg-background"
                          >
                            <option value="founder">Founder</option>
                            <option value="employee">Employee</option>
                            <option value="contractor">Contractor</option>
                          </select>
                        </TableCell>
                        <TableCell className="p-2">
                          <CurrencyInput
                            value={member.monthlyPayout}
                            onChange={(value) => updateTeamMember(key, index, 'monthlyPayout', value)}
                            className="h-7 text-xs"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTeamMember(key, index)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          >
                            ×
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTeamMember(key)}
                  className="w-full mt-2 text-xs h-7"
                >
                  + Add Member
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card className="border-2 border-blue-300">
        <CardHeader className="bg-blue-50 pb-3">
          <CardTitle className="text-base text-blue-900">Compensation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {departmentConfig.map(({ key, label }) => {
              const deptTotal = calculateDepartmentTotal(team[key] || []);
              const employeeCount = (team[key] || []).filter(m => m.type === 'employee').length;
              const contractorCount = (team[key] || []).filter(m => m.type === 'contractor').length;
              
              return (
                <div key={key} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
                  <p className="text-lg font-bold text-gray-900 font-mono">${(deptTotal / 1000).toFixed(1)}K</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {employeeCount}E / {contractorCount}C
                  </p>
                </div>
              );
            })}
            <div className="p-3 rounded-lg bg-blue-100 border-2 border-blue-300">
              <p className="text-xs font-medium text-blue-900 mb-1">This Payroll Sample</p>
              <p className="text-2xl font-bold text-blue-900 font-mono">${(calculateGrandTotal() / 1000).toFixed(1)}K</p>
              <p className="text-xs text-blue-700 mt-1">
                From Nov 6th payroll run
              </p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 border-2 border-orange-200">
              <p className="text-xs font-medium text-orange-900 mb-1">Total Oct Labor (QB)</p>
              <p className="text-2xl font-bold text-orange-900 font-mono">$124,272</p>
              <p className="text-xs text-orange-700 mt-1">
                Multiple payroll cycles
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const App = ({ userProfile }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editMode, setEditMode] = useState(false);
  
  const nextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));
  const goToSlide = (index) => setCurrentSlide(index);
  
  // Enable draggable cards when in edit mode
  useDraggableCards(editMode);
  
  // Automatically add draggable-card class to all Card components
  useEffect(() => {
    const cards = document.querySelectorAll('.rounded-lg.border.bg-card');
    cards.forEach(card => {
      if (editMode) {
        card.classList.add('draggable-card');
      } else {
        card.classList.remove('draggable-card');
      }
    });
  }, [editMode, currentSlide]);
  
  const resetLayout = () => {
    // Reset all card positions on current slide with smooth animation
    const cards = document.querySelectorAll('.draggable-card');
    cards.forEach(card => {
      // Ensure transition is active for smooth reset
      card.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s ease, height 0.3s ease';
      
      // Reset transformations
      card.style.transform = '';
      card.removeAttribute('data-x');
      card.removeAttribute('data-y');
      card.style.width = '';
      card.style.height = '';
    });
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const slides = [
    // Slide 1: Executive Summary with comprehensive metrics
    {
      title: "Executive Summary",
      subtitle: "Eqho, Inc. | Investment Opportunity | November 2025",
      content: (
        <div className="grid grid-cols-12 gap-4 h-full">
          <div className="col-span-8 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Financial Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">YTD Revenue</p>
                    <p className="text-2xl font-semibold">$635,390</p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <ArrowUp className="w-3 h-3 mr-1" />
                      512% growth Jan-Oct
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Growth Rate</p>
                    <p className="text-2xl font-semibold">19.9%</p>
                    <p className="text-xs text-muted-foreground mt-1">CMGR</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Annual Run Rate</p>
                    <p className="text-2xl font-semibold">$1.07M</p>
                    <p className="text-xs text-muted-foreground mt-1">Based on Oct 2025</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Operational Efficiency Benchmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Metric</TableHead>
                      <TableHead className="text-xs">Eqho</TableHead>
                      <TableHead className="text-xs">Industry Median</TableHead>
                      <TableHead className="text-xs">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Burn Multiple</TableCell>
                      <TableCell className="text-xs">1.2x</TableCell>
                      <TableCell className="text-xs">1.6x</TableCell>
                      <TableCell><Badge className="text-xs" variant="success">+25%</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Rule of 40</TableCell>
                      <TableCell className="text-xs">79%</TableCell>
                      <TableCell className="text-xs">40%</TableCell>
                      <TableCell><Badge className="text-xs" variant="success">+98%</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">Gross Margin</TableCell>
                      <TableCell className="text-xs">69%</TableCell>
                      <TableCell className="text-xs">75%</TableCell>
                      <TableCell><Badge className="text-xs" variant="success">-8%</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs font-medium">TowPilot CAC Payback</TableCell>
                      <TableCell className="text-xs">1.8 mo</TableCell>
                      <TableCell className="text-xs">16 mo</TableCell>
                      <TableCell><Badge className="text-xs" variant="success">+89%</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          
          <div className="col-span-4 space-y-4">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Investment Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <div>
                      <p className="text-xs font-medium">Hypergrowth Trajectory</p>
                      <p className="text-xs text-muted-foreground">250%+ annualized growth rate</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <div>
                      <p className="text-xs font-medium">Capital Efficient</p>
                      <p className="text-xs text-muted-foreground">Top quartile burn efficiency</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <div>
                      <p className="text-xs font-medium">AI-Native Platform</p>
                      <p className="text-xs text-muted-foreground">93% accuracy vs human QA</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                    <div>
                      <p className="text-xs font-medium">Enterprise Ready</p>
                      <p className="text-xs text-muted-foreground">69% gross margin expanding to 85%+</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="pt-2">
                  <p className="text-xs font-medium mb-2">Gross Margin Trajectory</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Jan 2025</span>
                      <span className="font-medium">53%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Sep 2025</span>
                      <span className="font-medium text-green-600">69%</span>
                    </div>
                    <Progress value={69} className="h-2" />
                    <div className="text-xs p-2 bg-green-50 rounded">
                      <p className="font-medium text-green-800">+16 pts improvement YTD</p>
                      <p className="text-green-700">
                        Infrastructure optimization & volume economics driving rapid margin expansion
                      </p>
                    </div>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      <li>• On track to exceed 70% by Q4 2025</li>
                      <li>• Target: 75%+ by Q2 2026</li>
                      <li>• Scale effects accelerating</li>
                    </ul>
                  </div>
                </div>
                
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },

    // Slide 2: Financial Performance Deep Dive
    {
      title: "Financial Performance Analysis",
      subtitle: "Revenue Growth & Unit Economics | January - October 2025",
      content: (
        <div className="grid grid-cols-12 gap-4 h-full overflow-y-auto">
          <div className="col-span-7 space-y-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Monthly Revenue Progression</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-10 gap-1 mb-2">
                    {[17.48, 25, 35, 45, 52, 60, 70, 78, 85, 89.47].map((value, i) => (
                      <div key={i} className="text-center">
                        <div className="h-20 relative flex items-end">
                          <div 
                            className="w-full bg-primary rounded-t"
                            style={{ height: `${(value / 89.47) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs mt-1">${value}K</p>
                        <p className="text-xs text-muted-foreground">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">P&L Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-xs">Total Revenue</TableCell>
                      <TableCell className="text-xs text-right font-medium">$635,390</TableCell>
                      <TableCell className="text-xs text-right">100.0%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Cost of Goods Sold</TableCell>
                      <TableCell className="text-xs text-right">($280,529.05)</TableCell>
                      <TableCell className="text-xs text-right">44.2%</TableCell>
                    </TableRow>
                    <TableRow className="font-medium">
                      <TableCell className="text-xs">Gross Profit</TableCell>
                      <TableCell className="text-xs text-right">$354,860.85</TableCell>
                      <TableCell className="text-xs text-right">55.8% avg</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-xs">Operating Expenses</TableCell>
                      <TableCell className="text-xs text-right">($1,058,976.92)</TableCell>
                      <TableCell className="text-xs text-right">166.7%</TableCell>
                    </TableRow>
                    <TableRow className="font-medium border-t">
                      <TableCell className="text-xs">Net Operating Income</TableCell>
                      <TableCell className="text-xs text-right text-red-600">($704,116.07)</TableCell>
                      <TableCell className="text-xs text-right">-110.8%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-5 space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Gross Margin Expansion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-xs space-y-1 p-2 bg-green-50 rounded">
                    <p className="font-medium text-green-800">Rapid Margin Improvement: 53% → 69% YTD</p>
                    <p className="text-green-700">Infrastructure optimization & scale driving +16 pts expansion</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Monthly Gross Margin Trend:</p>
                    <div className="grid grid-cols-9 gap-1">
                      {[
                        {m: 'Jan', v: 53.4},
                        {m: 'Feb', v: 36.5},
                        {m: 'Mar', v: 19.4},
                        {m: 'Apr', v: 68.2},
                        {m: 'May', v: 64.1},
                        {m: 'Jun', v: 49.0},
                        {m: 'Jul', v: 57.3},
                        {m: 'Aug', v: 62.3},
                        {m: 'Sep', v: 69.1}
                      ].map((d, i) => (
                        <div key={i} className="text-center">
                          <div className="h-16 relative flex items-end">
                            <div 
                              className={`w-full rounded-t ${i >= 6 ? 'bg-green-600' : 'bg-primary'}`}
                              style={{ height: `${(d.v / 70) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs mt-1">{d.v.toFixed(0)}%</p>
                          <p className="text-xs text-muted-foreground">{d.m}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="text-xs">
                    <p className="font-medium mb-1">Margin Drivers:</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      <li>• Volume-based cloud discounts activating</li>
                      <li>• Model efficiency & caching optimization</li>
                      <li>• Target: 75%+ by Q2 2026</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Operating Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Labor & Contractors</span>
                      <span>77%</span>
                    </div>
                    <Progress value={77} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Infrastructure</span>
                      <span>12%</span>
                    </div>
                    <Progress value={12} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Sales & Marketing</span>
                      <span>8.6%</span>
                    </div>
                    <Progress value={8.6} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Other Operating</span>
                      <span>2.4%</span>
                    </div>
                    <Progress value={2.4} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Key Financial Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">MRR Growth</p>
                    <p className="text-base font-semibold">19.9%</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">LTV/CAC Ratio</p>
                    <p className="text-base font-semibold">17x</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Quick Ratio</p>
                    <p className="text-base font-semibold">3.8</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Customer Acquisition Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="text-xs text-muted-foreground">Total CAC</p>
                    <p className="text-2xl font-bold text-green-700">$831</p>
                    <p className="text-xs text-green-600 mt-0.5">Best-in-class efficiency</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Sales Cost</span>
                      <span className="font-medium">$450</span>
                    </div>
                    <Progress value={54.2} className="h-2" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Marketing</span>
                      <span className="font-medium">$381</span>
                    </div>
                    <Progress value={45.8} className="h-2" />
                  </div>
                  <Separator />
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LTV</span>
                      <span className="font-medium">$14.1K</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ACV</span>
                      <span className="font-medium">$8,027</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payback Period</span>
                      <span className="font-medium">1.8 months</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },

    // Slide 3: Market Analysis & Competitive Position
    {
      title: "Market Position & Benchmarking",
      subtitle: "Industry Comparison & Competitive Analysis",
      content: (
        <div className="space-y-4 h-full">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">SaaS Industry Benchmark Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Metric</TableHead>
                      <TableHead className="text-xs text-right">Eqho</TableHead>
                      <TableHead className="text-xs text-right">Top Quartile</TableHead>
                      <TableHead className="text-xs text-right">Median</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    <TableRow>
                      <TableCell>Annual Growth Rate</TableCell>
                      <TableCell className="text-right font-medium text-green-600">250%+</TableCell>
                      <TableCell className="text-right">75%</TableCell>
                      <TableCell className="text-right">25%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Burn Multiple</TableCell>
                      <TableCell className="text-right font-medium text-green-600">1.2x</TableCell>
                      <TableCell className="text-right">1.5x</TableCell>
                      <TableCell className="text-right">1.6x</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Gross Margin</TableCell>
                      <TableCell className="text-right font-medium text-green-600">69%</TableCell>
                      <TableCell className="text-right">80%</TableCell>
                      <TableCell className="text-right">75%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>TowPilot CAC Payback</TableCell>
                      <TableCell className="text-right font-medium text-green-600">1.8 mo</TableCell>
                      <TableCell className="text-right">12 mo</TableCell>
                      <TableCell className="text-right">16 mo</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>S&M % of Revenue</TableCell>
                      <TableCell className="text-right font-medium text-orange-600">8.6%</TableCell>
                      <TableCell className="text-right">35%</TableCell>
                      <TableCell className="text-right">47%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">AI-Native Competitive Advantages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-2 border rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium">QA Accuracy vs Human</p>
                      <Badge variant="outline">93%</Badge>
                    </div>
                    <Progress value={93} className="h-1.5" />
                  </div>
                  
                  <div className="p-2 border rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium">Cost Reduction Achieved</p>
                      <Badge variant="outline">95%</Badge>
                    </div>
                    <Progress value={95} className="h-1.5" />
                  </div>
                  
                  <div className="p-2 border rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-medium">Platform Uptime SLA</p>
                      <Badge variant="outline">99.9%</Badge>
                    </div>
                    <Progress value={99.9} className="h-1.5" />
                  </div>

                  <Separator />
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-semibold">3</p>
                      <p className="text-xs text-muted-foreground">Industry Verticals</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">26</p>
                      <p className="text-xs text-muted-foreground">Team Members</p>
                    </div>
                    <div>
                      <p className="text-lg font-semibold">15yr</p>
                      <p className="text-xs text-muted-foreground">Founder History</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Revenue per Employee Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Eqho Current</p>
                  <p className="text-xl font-semibold">$41.5K</p>
                  <p className="text-xs text-muted-foreground">Annual run-rate</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Traditional SaaS</p>
                  <p className="text-xl font-semibold">$200K</p>
                  <p className="text-xs text-muted-foreground">Industry average</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">AI-Native Leaders</p>
                  <p className="text-xl font-semibold">$3.48M</p>
                  <p className="text-xs text-muted-foreground">Best-in-class</p>
                </div>
                <div className="text-center p-3 border rounded-lg bg-primary/5">
                  <p className="text-xs text-muted-foreground mb-1">Eqho Target (2026)</p>
                  <p className="text-xl font-semibold text-primary">$200K</p>
                  <p className="text-xs text-muted-foreground">At $3.4M ARR</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },

    // Slide 4: Business Model & Technology
    {
      title: "Business Model & Technology Platform",
      subtitle: "AI-Native Voice Infrastructure",
      content: (
        <div className="grid grid-cols-12 gap-4 h-full">
          <div className="col-span-8 space-y-4">
            <Tabs defaultValue="platform" className="h-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="platform">Platform Architecture</TabsTrigger>
                <TabsTrigger value="verticals">Target Verticals</TabsTrigger>
                <TabsTrigger value="pricing">Revenue Model</TabsTrigger>
              </TabsList>
              
              <TabsContent value="platform" className="space-y-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Core Technology Stack</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Infrastructure Layer</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full" />
                            <span className="text-xs">Enterprise telephony integration</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full" />
                            <span className="text-xs">Real-time voice processing</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full" />
                            <span className="text-xs">Multi-tenant architecture</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">AI Capabilities</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full" />
                            <span className="text-xs">Conversational AI agents</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full" />
                            <span className="text-xs">Natural language processing</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-primary rounded-full" />
                            <span className="text-xs">Automated QA & compliance</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Technical Differentiators</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody className="text-xs">
                        <TableRow>
                          <TableCell>Response Latency</TableCell>
                          <TableCell className="text-right">&lt; 300ms</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Concurrent Calls</TableCell>
                          <TableCell className="text-right">10,000+</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Languages Supported</TableCell>
                          <TableCell className="text-right">12</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>API Reliability</TableCell>
                          <TableCell className="text-right">99.99%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="verticals" className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Real Estate</CardTitle>
                      <CardDescription className="text-xs">Inside Real Estate Partnership</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <p className="text-xs">• Lead qualification</p>
                        <p className="text-xs">• Appointment scheduling</p>
                        <p className="text-xs">• Property inquiries</p>
                        <div className="pt-2">
                          <Badge variant="secondary" className="text-xs">Exclusive Partner</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Towing Services</CardTitle>
                      <CardDescription className="text-xs">TowPilot AI Dispatcher</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <p className="text-xs">• 24/7 dispatch</p>
                        <p className="text-xs">• Route optimization</p>
                        <p className="text-xs">• Customer service</p>
                        <div className="pt-2">
                          <Badge variant="secondary" className="text-xs">Market Leader</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Healthcare</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <p className="text-xs">• Patient scheduling</p>
                        <p className="text-xs">• Medicare support</p>
                        <p className="text-xs">• Compliance tracking</p>
                        <div className="pt-2">
                          <Badge variant="secondary" className="text-xs">Certified</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Market Opportunity by Vertical</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Real Estate</span>
                        <span className="text-xs font-medium">$2.3B TAM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Towing/Automotive</span>
                        <span className="text-xs font-medium">$850M TAM</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Healthcare</span>
                        <span className="text-xs font-medium">$5.1B TAM</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="pricing" className="space-y-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Revenue Model Structure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Component</TableHead>
                          <TableHead className="text-xs text-right">Pricing</TableHead>
                          <TableHead className="text-xs text-right">% of Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        <TableRow>
                          <TableCell>Platform License</TableCell>
                          <TableCell className="text-right">$500-5K/mo</TableCell>
                          <TableCell className="text-right">60%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Usage (per minute)</TableCell>
                          <TableCell className="text-right">$0.23-0.30</TableCell>
                          <TableCell className="text-right">30%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Professional Services</TableCell>
                          <TableCell className="text-right">$10-50K</TableCell>
                          <TableCell className="text-right">8%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Add-on Features</TableCell>
                          <TableCell className="text-right">Variable</TableCell>
                          <TableCell className="text-right">2%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Customer Economics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground mb-1">Avg Contract Value</p>
                        <p className="text-lg font-semibold">$8,027</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Gross Retention</p>
                        <p className="text-lg font-semibold">92%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Expansion Rate</p>
                        <p className="text-lg font-semibold">118%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">LTV</p>
                        <p className="text-lg font-semibold">$14.1K</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="col-span-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Unit Economics Path</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs">Current Gross Margin</span>
                      <span className="text-xs font-medium">69%</span>
                    </div>
                    <Progress value={69} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs">Q2 2026 Target</span>
                      <span className="text-xs font-medium">70%</span>
                    </div>
                    <Progress value={70} className="h-2" variant="secondary" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs">Industry Standard</span>
                      <span className="text-xs font-medium">75%</span>
                    </div>
                    <Progress value={75} className="h-2" variant="outline" />
                  </div>
                </div>
                
                <Separator className="my-3" />
                
                <div className="space-y-2">
                  <p className="text-xs font-medium">Margin Improvement Drivers</p>
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full mt-1" />
                      <p className="text-xs">Infrastructure optimization (-8%)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full mt-1" />
                      <p className="text-xs">Volume discounts (-4%)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full mt-1" />
                      <p className="text-xs">Automation scale (-3%)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Strategic Partnerships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-2 border rounded">
                  <p className="text-xs font-medium">Inside Real Estate</p>
                  <p className="text-xs text-muted-foreground">Exclusive voice AI provider</p>
                </div>
                <div className="p-2 border rounded">
                  <p className="text-xs font-medium">GoHighLevel</p>
                  <p className="text-xs text-muted-foreground">Lead Connector integration</p>
                </div>
                <div className="p-2 border rounded">
                  <p className="text-xs font-medium">Pipedream</p>
                  <p className="text-xs text-muted-foreground">Workflow automation</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },

    // Slide 5: Growth Strategy & Projections
    {
      title: "Growth Strategy & Financial Projections",
      subtitle: "Aggressive Growth: 10% M/M to Breakeven & Beyond",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Revenue Projections & Milestones</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Period</TableHead>
                        <TableHead className="text-xs text-right">ARR</TableHead>
                        <TableHead className="text-xs text-right">MRR</TableHead>
                        <TableHead className="text-xs text-right">Customers</TableHead>
                        <TableHead className="text-xs text-right">ACV</TableHead>
                        <TableHead className="text-xs text-right">Gross Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      <TableRow>
                        <TableCell className="font-medium">Current (Oct 2025)</TableCell>
                        <TableCell className="text-right">$1.07M</TableCell>
                        <TableCell className="text-right">$89K</TableCell>
                        <TableCell className="text-right">26</TableCell>
                        <TableCell className="text-right">$8,027</TableCell>
                        <TableCell className="text-right">69%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Month 3 (Jan 2026)</TableCell>
                        <TableCell className="text-right">$1.45M</TableCell>
                        <TableCell className="text-right">$121K</TableCell>
                        <TableCell className="text-right">35</TableCell>
                        <TableCell className="text-right">$8,027</TableCell>
                        <TableCell className="text-right">74%</TableCell>
                      </TableRow>
                      <TableRow className="bg-green-50">
                        <TableCell className="font-medium">Month 6 (Apr 2026) - Breakeven</TableCell>
                        <TableCell className="text-right font-semibold">$1.93M</TableCell>
                        <TableCell className="text-right">$161K</TableCell>
                        <TableCell className="text-right">47</TableCell>
                        <TableCell className="text-right">$8,027</TableCell>
                        <TableCell className="text-right">78%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Month 9 (Jul 2026)</TableCell>
                        <TableCell className="text-right">$2.57M</TableCell>
                        <TableCell className="text-right">$214K</TableCell>
                        <TableCell className="text-right">62</TableCell>
                        <TableCell className="text-right">$8,027</TableCell>
                        <TableCell className="text-right">80%</TableCell>
                      </TableRow>
                      <TableRow className="border-t">
                        <TableCell className="font-medium">Month 12 (Oct 2026)</TableCell>
                        <TableCell className="text-right font-semibold">$3.42M</TableCell>
                        <TableCell className="text-right">$285K</TableCell>
                        <TableCell className="text-right">82</TableCell>
                        <TableCell className="text-right">$8,027</TableCell>
                        <TableCell className="text-right">82%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            
            <div className="col-span-4">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Growth Drivers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-xs font-medium text-blue-900 mb-1">Aggressive Growth Scenario</p>
                      <p className="text-xs text-blue-700">10% M/M revenue growth with accelerated COGS efficiency</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-xs font-medium mb-2">Key Assumptions</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>• Revenue Growth: 10% M/M sustained</p>
                        <p>• COGS: 31% → 18% over 12 months</p>
                        <p>• Gross Margin: 69% → 82%</p>
                        <p>• Opex: Flat at ~$150-160K/month</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-xs font-medium mb-2">Margin Expansion Drivers</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>• Infrastructure optimization at scale</p>
                        <p>• Developer costs → fixed infrastructure</p>
                        <p>• Volume discounts on cloud services</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-xs font-medium mb-2">Path to Profitability</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>• Breakeven: Month 6 (April 2026)</p>
                        <p>• Cumulative burn: ~$430K</p>
                        <p>• Strong profit ramp post-breakeven</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Capital Efficiency Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Current Burn Multiple</span>
                    <span className="font-medium">1.2x</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Target Burn Multiple</span>
                    <span className="font-medium">&lt; 1.0x</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Path to Profitability</span>
                    <span className="font-medium">Q2 2027</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Cash to Break-even</span>
                    <span className="font-medium">$8.5M</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sales Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Sales Efficiency Ratio</span>
                    <span className="font-medium">0.85</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Sales Capacity (reps)</span>
                    <span className="font-medium">2 → 15</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Quota Attainment</span>
                    <span className="font-medium">120%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Pipeline Coverage</span>
                    <span className="font-medium">3.2x</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Market Expansion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Current Verticals</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>2026 Target Verticals</span>
                    <span className="font-medium">6</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Geographic Markets</span>
                    <span className="font-medium">US → Global</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Channel Partners</span>
                    <span className="font-medium">0 → 25</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },

    // Slide 6: Investment Terms & Use of Funds
    {
      title: "Investment Terms & Structure",
      subtitle: "Capital Requirements & Allocation Strategy",
      content: (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-8 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Use of Funds Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs text-right">%</TableHead>
                      <TableHead className="text-xs">Key Initiatives</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    <TableRow>
                      <TableCell className="font-medium">Sales & Marketing</TableCell>
                      <TableCell className="text-right">$200K</TableCell>
                      <TableCell className="text-right">40%</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p>• Customer acquisition acceleration</p>
                          <p>• Ad spend optimization</p>
                          <p>• Sales process automation</p>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Infrastructure & COGS Optimization</TableCell>
                      <TableCell className="text-right">$150K</TableCell>
                      <TableCell className="text-right">30%</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p>• Scale infrastructure for 10% M/M growth</p>
                          <p>• COGS efficiency improvements</p>
                          <p>• Developer cost → fixed infrastructure migration</p>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Product & Engineering</TableCell>
                      <TableCell className="text-right">$100K</TableCell>
                      <TableCell className="text-right">20%</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p>• Platform enhancements</p>
                          <p>• Automation features</p>
                          <p>• API improvements</p>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Working Capital</TableCell>
                      <TableCell className="text-right">$50K</TableCell>
                      <TableCell className="text-right">10%</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p>• Cash buffer to breakeven</p>
                          <p>• Operating reserves</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Expected Returns & Exit Scenarios</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Scenario</TableHead>
                      <TableHead className="text-xs text-right">Timeline</TableHead>
                      <TableHead className="text-xs text-right">ARR at Exit</TableHead>
                      <TableHead className="text-xs text-right">Valuation</TableHead>
                      <TableHead className="text-xs text-right">Multiple</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    <TableRow>
                      <TableCell>Cashflow Positive → Bootstrap</TableCell>
                      <TableCell className="text-right">6 mo+</TableCell>
                      <TableCell className="text-right">$3.4M+</TableCell>
                      <TableCell className="text-right">Self-sustaining</TableCell>
                      <TableCell className="text-right">∞</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Series A ($3-5M)</TableCell>
                      <TableCell className="text-right">12-18 mo</TableCell>
                      <TableCell className="text-right">$5-8M</TableCell>
                      <TableCell className="text-right">$20-30M</TableCell>
                      <TableCell className="text-right">4-7x</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Strategic Acquisition</TableCell>
                      <TableCell className="text-right">2-3 years</TableCell>
                      <TableCell className="text-right">$10-15M</TableCell>
                      <TableCell className="text-right">$50-75M</TableCell>
                      <TableCell className="text-right">11-17x</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Growth Equity Round</TableCell>
                      <TableCell className="text-right">3-4 years</TableCell>
                      <TableCell className="text-right">$20M+</TableCell>
                      <TableCell className="text-right">$100M+</TableCell>
                      <TableCell className="text-right">22x+</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Investment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Round</span>
                    <span className="font-medium">Preferred Equity</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Amount Raising</span>
                    <span className="font-medium">$500K</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Pre-Money Valuation</span>
                    <span className="font-medium">$15.0M</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Post-Money</span>
                    <span className="font-medium">$15.5M</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Minimum Investment</span>
                    <span className="font-medium">$50K</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <p className="text-xs font-medium">Key Terms</p>
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full mt-1" />
                      <p className="text-xs">1x liquidation preference</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full mt-1" />
                      <p className="text-xs">Pro-rata rights</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full mt-1" />
                      <p className="text-xs">Board seat (lead investor)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full mt-1" />
                      <p className="text-xs">Information rights</p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <p className="text-xs font-medium">Timeline</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">First Close</span>
                      <span>Dec 2025</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Final Close</span>
                      <span>Jan 2026</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Runway to Breakeven</span>
                      <span>6 months</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Investor Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="p-2 bg-primary/5 rounded-lg">
                  <p className="text-xs font-medium">Strategic Value</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Access to AI voice infrastructure leader
                  </p>
                </div>
                <div className="p-2 bg-primary/5 rounded-lg">
                  <p className="text-xs font-medium">Market Position</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Early entry in $8.2B TAM market
                  </p>
                </div>
                <div className="p-2 bg-primary/5 rounded-lg">
                  <p className="text-xs font-medium">Proven Metrics</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Validated unit economics at scale
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },

    // Slide 7: 36-Month Financial Projection
    {
      title: "36-Month Financial Projection",
      subtitle: "Path to Profitability & Scale | Nov 2025 - Oct 2028",
      content: (
        <div className="space-y-4 h-full overflow-y-auto">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Revenue & ARR Trajectory (36 Months)</CardTitle>
                  <CardDescription className="text-xs">10% M/M growth from $89K MRR to $2.77M MRR</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-1">
                      {[98, 108, 119, 131, 144, 158, 174, 192, 211, 232, 255, 281, 309, 340, 374, 411, 452, 497, 547, 602, 662, 728, 801, 881, 969, 1066, 1173, 1290, 1419, 1561, 1717, 1889, 2078, 2286, 2514, 2766].map((value, i) => (
                        <div key={i} className="text-center">
                          <div className="h-16 relative flex items-end">
                            <div 
                              className={`w-full rounded-t ${i >= 9 ? 'bg-green-600' : 'bg-primary'}`}
                              style={{ height: `${(value / 2766) * 100}%` }}
                            />
                          </div>
                          {i % 3 === 0 && (
                            <p className="text-xs mt-1">${value}K</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div className="text-center p-2 border rounded">
                        <p className="text-muted-foreground">Current (Oct 2025)</p>
                        <p className="text-lg font-semibold">$1.07M</p>
                        <p className="text-muted-foreground">ARR</p>
                      </div>
                      <div className="text-center p-2 border rounded bg-green-50">
                        <p className="text-muted-foreground">Breakeven (Aug 2026)</p>
                        <p className="text-lg font-semibold text-green-700">$2.78M</p>
                        <p className="text-muted-foreground">ARR</p>
                      </div>
                      <div className="text-center p-2 border rounded bg-primary/5">
                        <p className="text-muted-foreground">Month 36 (Oct 2028)</p>
                        <p className="text-lg font-semibold text-primary">$33.2M</p>
                        <p className="text-muted-foreground">ARR</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Key Milestones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="p-2 bg-primary/5 rounded">
                    <p className="text-xs font-medium">Month 10 (Aug 2026)</p>
                    <p className="text-xs text-muted-foreground">Breakeven: $2.78M ARR</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded">
                    <p className="text-xs font-medium text-green-800">Month 16 (Feb 2027)</p>
                    <p className="text-xs text-green-700">Cumulative Cash Flow Positive</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded">
                    <p className="text-xs font-medium text-blue-800">Month 24 (Oct 2027)</p>
                    <p className="text-xs text-blue-700">$10.6M ARR, $515K/mo profit</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <p className="text-xs font-medium text-purple-800">Month 36 (Oct 2028)</p>
                    <p className="text-xs text-purple-700">$33.2M ARR, $2.1M/mo profit</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Capital Efficiency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Max Capital Needed</span>
                    <span className="font-medium">$449K</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Investment</span>
                    <span className="font-medium">$500K</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Safety Buffer</span>
                    <span className="font-medium text-green-600">$51K (11%)</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xs">
                    <span>Month 36 Cumulative</span>
                    <span className="font-medium text-green-600">+$17.4M</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detailed 36-Month Financial Model</CardTitle>
              <CardDescription className="text-xs">Quarterly summary with key metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Quarter</TableHead>
                    <TableHead className="text-xs text-right">Ending MRR</TableHead>
                    <TableHead className="text-xs text-right">ARR</TableHead>
                    <TableHead className="text-xs text-right">Avg GM%</TableHead>
                    <TableHead className="text-xs text-right">Avg COGS%</TableHead>
                    <TableHead className="text-xs text-right">Quarterly NOI</TableHead>
                    <TableHead className="text-xs text-right">Cumulative CF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  <TableRow>
                    <TableCell className="font-medium">Q1 2026 (Jan)</TableCell>
                    <TableCell className="text-right">$119K</TableCell>
                    <TableCell className="text-right">$1.43M</TableCell>
                    <TableCell className="text-right">61.9%</TableCell>
                    <TableCell className="text-right">38.1%</TableCell>
                    <TableCell className="text-right text-red-600">-$233K</TableCell>
                    <TableCell className="text-right text-red-600">-$233K</TableCell>
                  </TableRow>
                  <TableRow className="bg-green-50">
                    <TableCell className="font-medium">Q2 2026 (Apr)</TableCell>
                    <TableCell className="text-right">$158K</TableCell>
                    <TableCell className="text-right">$1.90M</TableCell>
                    <TableCell className="text-right">63.7%</TableCell>
                    <TableCell className="text-right">36.3%</TableCell>
                    <TableCell className="text-right text-red-600">-$159K</TableCell>
                    <TableCell className="text-right text-red-600">-$392K</TableCell>
                  </TableRow>
                  <TableRow className="bg-green-100">
                    <TableCell className="font-medium">Q3 2026 (Jul) - Breakeven</TableCell>
                    <TableCell className="text-right">$211K</TableCell>
                    <TableCell className="text-right">$2.53M</TableCell>
                    <TableCell className="text-right">65.5%</TableCell>
                    <TableCell className="text-right">34.5%</TableCell>
                    <TableCell className="text-right text-red-600">-$57K</TableCell>
                    <TableCell className="text-right text-red-600">-$449K</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Q4 2026 (Oct)</TableCell>
                    <TableCell className="text-right">$281K</TableCell>
                    <TableCell className="text-right">$3.37M</TableCell>
                    <TableCell className="text-right">67.8%</TableCell>
                    <TableCell className="text-right">32.2%</TableCell>
                    <TableCell className="text-right text-green-600">+$182K</TableCell>
                    <TableCell className="text-right text-red-600">-$367K</TableCell>
                  </TableRow>
                  <TableRow className="border-t">
                    <TableCell className="font-medium">Q1 2027 (Jan)</TableCell>
                    <TableCell className="text-right">$374K</TableCell>
                    <TableCell className="text-right">$4.48M</TableCell>
                    <TableCell className="text-right">69.6%</TableCell>
                    <TableCell className="text-right">30.4%</TableCell>
                    <TableCell className="text-right text-green-600">+$434K</TableCell>
                    <TableCell className="text-right text-green-600">+$47K</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Q2 2027 (Apr)</TableCell>
                    <TableCell className="text-right">$497K</TableCell>
                    <TableCell className="text-right">$5.97M</TableCell>
                    <TableCell className="text-right">71.4%</TableCell>
                    <TableCell className="text-right">28.6%</TableCell>
                    <TableCell className="text-right text-green-600">+$634K</TableCell>
                    <TableCell className="text-right text-green-600">+$432K</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Q3 2027 (Jul)</TableCell>
                    <TableCell className="text-right">$662K</TableCell>
                    <TableCell className="text-right">$7.95M</TableCell>
                    <TableCell className="text-right">73.1%</TableCell>
                    <TableCell className="text-right">26.9%</TableCell>
                    <TableCell className="text-right text-green-600">+$1.03M</TableCell>
                    <TableCell className="text-right text-green-600">+$1.31M</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Q4 2027 (Oct)</TableCell>
                    <TableCell className="text-right">$881K</TableCell>
                    <TableCell className="text-right">$10.57M</TableCell>
                    <TableCell className="text-right">74.9%</TableCell>
                    <TableCell className="text-right">25.1%</TableCell>
                    <TableCell className="text-right text-green-600">+$1.46M</TableCell>
                    <TableCell className="text-right text-green-600">+$2.67M</TableCell>
                  </TableRow>
                  <TableRow className="border-t bg-primary/5">
                    <TableCell className="font-medium">Q1 2028 (Jan)</TableCell>
                    <TableCell className="text-right">$1.17M</TableCell>
                    <TableCell className="text-right">$14.08M</TableCell>
                    <TableCell className="text-right">76.7%</TableCell>
                    <TableCell className="text-right">23.3%</TableCell>
                    <TableCell className="text-right text-green-600">+$2.12M</TableCell>
                    <TableCell className="text-right text-green-600">+$4.68M</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Q2 2028 (Apr)</TableCell>
                    <TableCell className="text-right">$1.56M</TableCell>
                    <TableCell className="text-right">$18.73M</TableCell>
                    <TableCell className="text-right">78.5%</TableCell>
                    <TableCell className="text-right">21.5%</TableCell>
                    <TableCell className="text-right text-green-600">+$3.16M</TableCell>
                    <TableCell className="text-right text-green-600">+$7.57M</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Q3 2028 (Jul)</TableCell>
                    <TableCell className="text-right">$2.08M</TableCell>
                    <TableCell className="text-right">$24.94M</TableCell>
                    <TableCell className="text-right">80.2%</TableCell>
                    <TableCell className="text-right">19.8%</TableCell>
                    <TableCell className="text-right text-green-600">+$4.89M</TableCell>
                    <TableCell className="text-right text-green-600">+$11.7M</TableCell>
                  </TableRow>
                  <TableRow className="font-semibold border-t">
                    <TableCell className="font-bold">Q4 2028 (Oct)</TableCell>
                    <TableCell className="text-right">$2.77M</TableCell>
                    <TableCell className="text-right">$33.19M</TableCell>
                    <TableCell className="text-right">81.4%</TableCell>
                    <TableCell className="text-right">18.6%</TableCell>
                    <TableCell className="text-right text-green-600">+$6.77M</TableCell>
                    <TableCell className="text-right text-green-600">+$17.4M</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Gross Margin Expansion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Oct 2025 (Current)</span>
                      <span className="font-medium">60.7%</span>
                    </div>
                    <Progress value={60.7} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Month 12 (Oct 2026)</span>
                      <span className="font-medium">67.8%</span>
                    </div>
                    <Progress value={67.8} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Month 24 (Oct 2027)</span>
                      <span className="font-medium">74.9%</span>
                    </div>
                    <Progress value={74.9} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Month 36 (Oct 2028)</span>
                      <span className="font-medium text-green-600">82.0%</span>
                    </div>
                    <Progress value={82.0} className="h-2" />
                  </div>
                  <Separator />
                  <div className="text-xs text-center p-2 bg-green-50 rounded">
                    <p className="font-medium text-green-800">+21.3 pts improvement</p>
                    <p className="text-green-700">COGS: 39.3% → 18.0%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Profitability Ramp</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Month 10 NOI</span>
                    <span className="font-medium text-green-600">+$10K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Month 12 NOI</span>
                    <span className="font-medium text-green-600">+$45K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Month 24 NOI</span>
                    <span className="font-medium text-green-600">+$515K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Month 36 NOI</span>
                    <span className="font-medium text-green-600">+$2.1M</span>
                  </div>
                  <Separator />
                  <div className="p-2 bg-primary/5 rounded text-center">
                    <p className="font-medium">Annual Run Rate</p>
                    <p className="text-lg font-bold text-primary">$25.5M</p>
                    <p className="text-muted-foreground">Month 36 profit potential</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Growth Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sustained CMGR</span>
                  <span className="font-medium">10%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MRR Multiple</span>
                  <span className="font-medium">31x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ARR Multiple</span>
                  <span className="font-medium">31x</span>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="font-medium">Key Assumptions:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• 10% M/M revenue growth</li>
                    <li>• COGS: 39% → 18% over 36mo</li>
                    <li>• OpEx: Flat at $145K/month</li>
                    <li>• No customer churn modeled</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cash Flow Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-3 text-xs">
                <div className="p-3 border rounded text-center">
                  <p className="text-muted-foreground mb-1">Month 1</p>
                  <p className="font-semibold text-red-600">-$85K</p>
                  <p className="text-muted-foreground">Peak burn</p>
                </div>
                <div className="p-3 border rounded text-center">
                  <p className="text-muted-foreground mb-1">Month 6</p>
                  <p className="font-semibold text-red-600">-$43K</p>
                  <p className="text-muted-foreground">Near breakeven</p>
                </div>
                <div className="p-3 border rounded text-center bg-green-50">
                  <p className="text-muted-foreground mb-1">Month 10</p>
                  <p className="font-semibold text-green-700">+$10K</p>
                  <p className="text-muted-foreground">First profit</p>
                </div>
                <div className="p-3 border rounded text-center bg-green-100">
                  <p className="text-muted-foreground mb-1">Month 16</p>
                  <p className="font-semibold text-green-700">+$47K</p>
                  <p className="text-muted-foreground">CF positive</p>
                </div>
                <div className="p-3 border rounded text-center">
                  <p className="text-muted-foreground mb-1">Month 24</p>
                  <p className="font-semibold text-green-600">+$2.7M</p>
                  <p className="text-muted-foreground">Strong profit</p>
                </div>
                <div className="p-3 border rounded text-center bg-primary/10">
                  <p className="text-muted-foreground mb-1">Month 36</p>
                  <p className="font-semibold text-primary">+$17.4M</p>
                  <p className="text-muted-foreground">Cumulative</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },

    // Slide 8: SaaS Metrics & Customer Segmentation
    {
      title: "SaaS Metrics & Customer Segmentation",
      subtitle: "TowPilot vs Other Products | Current State Analysis",
      content: (
        <div className="space-y-4 h-full overflow-y-auto">
          {/* MRR Metrics with Drill-Down - All data backed by Stripe API */}
          <MRRMetrics showDrillDown={true} />

          {/* October Revenue Breakdown with Drill-Down */}
          <OctoberRevenueBreakdown />

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Revenue Composition</CardTitle>
                  <CardDescription className="text-xs">Subscription MRR vs Total Revenue (P&L)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200">
                    <div className="flex items-center gap-2">
                      <BarChart className="h-3.5 w-3.5 text-amber-600" />
                      <p className="text-xs font-medium text-amber-900">Note: Subscription MRR</p>
                    </div>
                    <p className="text-xs text-amber-700">
                      Stripe subscriptions show subscription MRR vs $89,469 total revenue (P&L). The difference represents 
                      usage-based charges, professional services, and onboarding fees not captured in recurring subscriptions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-4 space-y-4">
              {/* Validated Metrics from Backend */}
              <ValidatedMetrics />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Unit Economics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CAC</span>
                    <span className="font-medium">$831</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LTV (36mo)</span>
                    <span className="font-medium">$13,214</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LTV/CAC Ratio</span>
                    <span className="font-medium text-green-600">15.9x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CAC Payback</span>
                    <span className="font-medium text-green-600">2.3 mo</span>
                  </div>
                  <Separator />
                  <div className="p-2 bg-green-50 rounded">
                    <p className="font-medium text-green-800 text-center">Best-in-Class Economics</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">TowPilot Pricing Tiers</CardTitle>
                <CardDescription className="text-xs">Customer distribution across plans</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Tier</TableHead>
                      <TableHead className="text-xs text-right">Customers</TableHead>
                      <TableHead className="text-xs text-right">MRR</TableHead>
                      <TableHead className="text-xs text-right">ARPU</TableHead>
                      <TableHead className="text-xs text-right">% of Tow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    <TableRow>
                      <TableCell>Heavy Duty</TableCell>
                      <TableCell className="text-right">14</TableCell>
                      <TableCell className="text-right">$15,744</TableCell>
                      <TableCell className="text-right">$1,125</TableCell>
                      <TableCell className="text-right">32.9%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Medium Duty</TableCell>
                      <TableCell className="text-right">22</TableCell>
                      <TableCell className="text-right">$11,535</TableCell>
                      <TableCell className="text-right">$524</TableCell>
                      <TableCell className="text-right">24.1%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Standard</TableCell>
                      <TableCell className="text-right">21</TableCell>
                      <TableCell className="text-right">$11,269</TableCell>
                      <TableCell className="text-right">$537</TableCell>
                      <TableCell className="text-right">23.5%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Basic/Light</TableCell>
                      <TableCell className="text-right">6</TableCell>
                      <TableCell className="text-right">$2,388</TableCell>
                      <TableCell className="text-right">$398</TableCell>
                      <TableCell className="text-right">5.0%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Other TowPilot</TableCell>
                      <TableCell className="text-right">11</TableCell>
                      <TableCell className="text-right">$6,977</TableCell>
                      <TableCell className="text-right">$634</TableCell>
                      <TableCell className="text-right">14.6%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cohort Performance</CardTitle>
                <CardDescription className="text-xs">Retention and expansion metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-medium mb-2">Retention by Segment</h4>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>TowPilot Retention</span>
                          <span className="font-medium text-green-600">88.1%</span>
                        </div>
                        <Progress value={88.1} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Other Products</span>
                          <span className="font-medium">68.8%</span>
                        </div>
                        <Progress value={68.8} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold">Overall Platform</span>
                          <span className="font-semibold text-green-600">85.0%</span>
                        </div>
                        <Progress value={85.0} className="h-2" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-xs font-medium mb-2">Customer Metrics</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 border rounded text-center">
                        <p className="text-xs text-muted-foreground">Active</p>
                        <p className="text-xl font-bold text-green-600">85</p>
                      </div>
                      <div className="p-2 border rounded text-center">
                        <p className="text-xs text-muted-foreground">Churned</p>
                        <p className="text-xl font-bold text-red-600">15</p>
                      </div>
                      <div className="p-2 border rounded text-center">
                        <p className="text-xs text-muted-foreground">Net Adds</p>
                        <p className="text-xl font-bold">+70</p>
                      </div>
                      <div className="p-2 border rounded text-center">
                        <p className="text-xs text-muted-foreground">Growth</p>
                        <p className="text-xl font-bold">467%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Revenue Composition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Recurring (Subscriptions)</span>
                      <span className="font-medium">See MRR Metrics above</span>
                    </div>
                    <Progress value={62.5} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">62.5% of total revenue</p>
                    <p className="text-xs text-muted-foreground mt-1">Subscription MRR from Stripe API</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Usage & Services</span>
                      <span className="font-medium">$33,556</span>
                    </div>
                    <Progress value={37.5} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">37.5% of total revenue</p>
                    <p className="text-xs text-muted-foreground mt-1">Per-minute, services, onboarding</p>
                  </div>
                  <Separator />
                  <div className="text-center p-2 bg-primary/5 rounded">
                    <p className="text-xs text-muted-foreground">Total Monthly Revenue (P&L)</p>
                    <p className="text-xl font-bold">$89,469</p>
                    <p className="text-xs text-muted-foreground">October 2025 • QuickBooks P&L</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Customer Acquisition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total CAC</span>
                    <span className="font-medium">$831</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sales Cost</span>
                    <span>$450</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marketing Cost</span>
                    <span>$381</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payback Period</span>
                    <span className="font-medium text-green-600">2.3 months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">vs Industry Median</span>
                    <span className="text-green-600">86% faster</span>
                  </div>
                  <Separator />
                  <div className="p-2 bg-green-50 rounded text-center">
                    <p className="font-medium text-green-800">World-Class CAC</p>
                    <p className="text-green-700">Top 5% efficiency</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Expansion Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Retention</span>
                    <span className="font-medium">92%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Retention</span>
                    <span className="font-medium text-green-600">118%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expansion Revenue</span>
                    <span className="font-medium">18%</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ACV</span>
                    <span className="font-medium">$7,894</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LTV</span>
                    <span className="font-medium">$13,214</span>
                  </div>
                  <Separator />
                  <div className="p-2 bg-blue-50 rounded text-center">
                    <p className="font-medium text-blue-800">LTV/CAC</p>
                    <p className="text-2xl font-bold text-blue-900">15.9x</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Key Insights & Strategic Focus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="space-y-2">
                  <h4 className="font-medium">TowPilot Dominance</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• 87% of customers (74/85)</li>
                    <li>• 85.7% of subscription MRR</li>
                    <li>• Higher retention (88.1% vs 68.8%)</li>
                    <li>• Clear product-market fit</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Revenue Diversification</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• 62.5% recurring subscriptions</li>
                    <li>• 37.5% usage/services revenue</li>
                    <li>• Multiple pricing tiers validated</li>
                    <li>• Strong upsell potential</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Growth Opportunity</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• 11 non-TowPilot customers</li>
                    <li>• Higher ARPU ($727 vs $647)</li>
                    <li>• Expansion into new verticals</li>
                    <li>• Enterprise opportunity</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    },

    // Slide 9: Interactive Financial Model
    {
      title: "Growth-Focused Financial Model",
      subtitle: "Interactive 12-Month Projection | Growth-Focused Model | Based on Sept 2025 Actuals",
      content: (
        <FinancialModelSlide />
      )
    },
    // Slide 10: Team & Compensation
    {
      title: "Team & Compensation Structure",
      subtitle: "Actual QuickBooks Payroll Data | Nov 6th Payroll Run (Oct Work) | $124K Total October Labor",
      content: (
        <TeamCompensationSlide />
      )
    },
    // Slide 11: QB AI Agent Financial Report
    {
      title: "AI Financial Analysis Report",
      subtitle: "QuickBooks AI Agent | October 2025 Analysis with 90-Day Cash Flow Forecast",
      content: (
        <FinancialReport />
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Eqho, Inc.</h1>
            <Badge variant="outline">Funding Round</Badge>
          </div>
          <div className="flex items-center gap-4">
            {/* User Profile & Logout */}
            <UserProfile userProfile={userProfile} />
            
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="gap-2"
            >
              <GripVertical className="w-4 h-4" />
              {editMode ? "Lock Layout" : "Edit Layout"}
            </Button>
            {editMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetLayout}
              >
                Reset Layout
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {currentSlide + 1} / {slides.length}
            </span>
            <Progress value={(currentSlide + 1) / slides.length * 100} className="w-32" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={`flex-1 container mx-auto px-4 py-6 ${editMode ? 'edit-mode' : ''}`}
        style={{ position: 'relative' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-2xl text-xl font-bold">{slides[currentSlide].title}</h2>
            <p className="text-sm text-muted-foreground">{slides[currentSlide].subtitle}</p>
          </div>
          {editMode && (
            <Badge variant="secondary" className="gap-2 hidden md:flex">
              <GripVertical className="w-3 h-3" />
              Drag to reposition
            </Badge>
          )}
        </div>
        
        <div className="h-[calc(100vh-200px)] overflow-auto" style={{ position: 'relative' }}>
          {slides[currentSlide].content}
        </div>
      </div>

      {/* Navigation */}
      <div className="border-t p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={prevSlide}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    currentSlide === index 
                      ? "bg-primary w-6" 
                      : "bg-muted hover:bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>
            
            <span className="text-sm text-muted-foreground font-medium">
              Page {currentSlide + 1} of {slides.length}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default App;