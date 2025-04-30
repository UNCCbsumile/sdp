"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Strategy, StrategyType, DCAConfig } from "@/types/strategy"
import type { StrategyConfig } from "@/types/strategy"
import type { CryptoData } from "@/types/crypto"
import { toast } from "sonner"
import { useStrategies } from "@/hooks/use-strategies"

// Props for the StrategyConfig component
interface StrategyConfigProps {
  cryptoData: CryptoData[]
  onStrategyChange: (strategy: Strategy | null) => void
  strategy: Strategy | null
  executeOrder: (type: "buy" | "sell", symbol: string, amount: number, price: number) => void
}

// Main component for configuring trading strategies
export default function StrategyConfig({ cryptoData, onStrategyChange, strategy, executeOrder }: StrategyConfigProps) {
  const { addStrategy, updateStrategy, deleteStrategy, refreshStrategies } = useStrategies()
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<StrategyType>(strategy?.config.type || 'DCA');

  // Helper to update the strategy config and notify parent
  const handleConfigChange = (updates: Partial<StrategyConfig>) => {
    if (!strategy) {
      // If no strategy exists, create a new one
      const newStrategy: Strategy = {
        id: Math.random().toString(36).substr(2, 9),
        name: `${selectedType} Strategy`,
        config: {
          type: selectedType,
          enabled: false,
          symbol: cryptoData[0]?.id || '',
          ...updates,
        } as StrategyConfig,
      };
      onStrategyChange(newStrategy);
      return;
    }
    
    const newConfig = { ...strategy.config, ...updates };
    onStrategyChange({ ...strategy, config: newConfig as StrategyConfig });
  };

  // Render the fields for the selected strategy type
  const renderStrategyFields = () => {
    switch (selectedType) {
      case 'DCA':
        // Dollar-Cost Averaging fields
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="dca-amount">Investment Amount (USD)</Label>
              <Input
                id="dca-amount"
                type="number"
                value={strategy?.config.type === 'DCA' ? (strategy.config as DCAConfig).amount || '' : ''}
                onChange={(e) => handleConfigChange({ 
                  type: 'DCA',
                  amount: e.target.value ? parseFloat(e.target.value) : 0 
                })}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dca-interval">Interval (hours)</Label>
              <Input
                id="dca-interval"
                type="number"
                value={strategy?.config.type === 'DCA' ? (strategy.config as DCAConfig).interval || '' : ''}
                onChange={(e) => handleConfigChange({ 
                  type: 'DCA',
                  interval: e.target.value ? parseFloat(e.target.value) : 0.01 
                })}
                min="0.01"
                step="0.01"
                placeholder="Enter interval in hours (e.g. 0.1 for 6 minutes)"
              />
              <p className="text-sm text-muted-foreground">
                Minimum: 0.01 hours (36 seconds). Examples: 0.1 = 6 minutes, 0.05 = 3 minutes, 0.02 = ~1 minute
              </p>
            </div>
          </>
        );

      case 'MOVING_AVERAGE':
        // Moving Average fields
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="ma-short">Short Period (days)</Label>
              <Input
                id="ma-short"
                type="number"
                value={(strategy?.config as any)?.shortPeriod || ""}
                onChange={(e) => handleConfigChange({ shortPeriod: parseInt(e.target.value) })}
                min="1"
                step="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ma-long">Long Period (days)</Label>
              <Input
                id="ma-long"
                type="number"
                value={(strategy?.config as any)?.longPeriod || ""}
                onChange={(e) => handleConfigChange({ longPeriod: parseInt(e.target.value) })}
                min="1"
                step="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ma-amount">Investment Amount (USD)</Label>
              <Input
                id="ma-amount"
                type="number"
                value={(strategy?.config as any)?.amount || ""}
                onChange={(e) => handleConfigChange({ amount: parseFloat(e.target.value) })}
                min="0"
                step="1"
              />
            </div>
          </>
        );

      case 'GRID':
        // Grid Trading fields
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="grid-upper">Upper Limit (USD)</Label>
              <Input
                id="grid-upper"
                type="number"
                value={(strategy?.config as any)?.upperLimit || ""}
                onChange={(e) => handleConfigChange({ upperLimit: parseFloat(e.target.value) })}
                min="0"
                step="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid-lower">Lower Limit (USD)</Label>
              <Input
                id="grid-lower"
                type="number"
                value={(strategy?.config as any)?.lowerLimit || ""}
                onChange={(e) => handleConfigChange({ lowerLimit: parseFloat(e.target.value) })}
                min="0"
                step="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid-lines">Number of Grid Lines</Label>
              <Input
                id="grid-lines"
                type="number"
                value={(strategy?.config as any)?.gridLines || ""}
                onChange={(e) => handleConfigChange({ gridLines: parseInt(e.target.value) })}
                min="2"
                step="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid-investment">Investment per Grid (USD)</Label>
              <Input
                id="grid-investment"
                type="number"
                value={(strategy?.config as any)?.investmentPerGrid || ""}
                onChange={(e) => handleConfigChange({ investmentPerGrid: parseFloat(e.target.value) })}
                min="0"
                step="1"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategy) return;

    setIsSubmitting(true);
    try {
      // Set enabled to true but don't set lastExecuted (let the strategy manager handle it)
      const strategyToSave = {
        ...strategy,
        config: {
          ...strategy.config,
          enabled: true
        }
      };

      const savedStrategy = strategy.id 
        ? await updateStrategy(strategyToSave)
        : await addStrategy(strategyToSave);
      
      toast.success('Strategy saved successfully');
      
      // Wait a moment for the toast to show and for all updates to complete
      setTimeout(() => {
        window.location.href = '/dashboard?tab=portfolio';
      }, 1500);
      
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Failed to save strategy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!strategy?.id) return;

    if (!confirm('Are you sure you want to delete this strategy?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteStrategy(strategy.id);
      onStrategyChange(null);
      toast.success('Strategy deleted successfully');
      
      // Wait a moment for the toast to show, then refresh and redirect to portfolio tab
      setTimeout(() => {
        window.location.href = '/dashboard?tab=portfolio';
      }, 1000);
    } catch (error) {
      console.error('Error deleting strategy:', error);
      toast.error('Failed to delete strategy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Trading Strategy</CardTitle>
          <CardDescription>Configure your automated trading strategy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Select the strategy type */}
          <div className="space-y-2">
            <Label htmlFor="strategy-type">Strategy Type</Label>
            <Select
              value={selectedType}
              onValueChange={(value: StrategyType) => {
                setSelectedType(value);
                // Create new strategy configuration based on type
                const newStrategy: Strategy = {
                  id: strategy?.id || Math.random().toString(36).substr(2, 9),
                  name: `${value} Strategy`,
                  config: {
                    type: value,
                    enabled: strategy?.config.enabled || false,
                    symbol: strategy?.config.symbol || (cryptoData[0]?.id || ''),
                    // Add default values based on strategy type
                    ...(value === 'DCA' && {
                      amount: 0,
                      interval: 24, // Default to daily (24 hours)
                    }),
                    ...(value === 'MOVING_AVERAGE' && {
                      shortPeriod: 7,
                      longPeriod: 30,
                      amount: 0,
                    }),
                    ...(value === 'GRID' && {
                      upperLimit: 0,
                      lowerLimit: 0,
                      gridLines: 5,
                      investmentPerGrid: 0,
                    }),
                  } as StrategyConfig,
                };
                onStrategyChange(newStrategy);
              }}
            >
              <SelectTrigger id="strategy-type">
                <SelectValue placeholder="Select a strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DCA">Dollar-Cost Averaging</SelectItem>
                <SelectItem value="MOVING_AVERAGE">Moving Average</SelectItem>
                <SelectItem value="GRID">Grid Trading</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select the cryptocurrency for the strategy */}
          <div className="space-y-2">
            <Label htmlFor="strategy-symbol">Cryptocurrency</Label>
            <Select
              value={strategy?.config.symbol || ''}
              onValueChange={(value) => handleConfigChange({ symbol: value })}
            >
              <SelectTrigger id="strategy-symbol">
                <SelectValue placeholder="Select a cryptocurrency" />
              </SelectTrigger>
              <SelectContent>
                {/* List all available cryptocurrencies */}
                {cryptoData.map((crypto) => (
                  <SelectItem key={crypto.id} value={crypto.id}>
                    {crypto.name} ({crypto.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Render the fields for the selected strategy type */}
          {renderStrategyFields()}

          {/* Add buttons at the bottom */}
          <div className="flex justify-end space-x-2 pt-4">
            {strategy?.id && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                Delete Strategy
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Strategy'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}