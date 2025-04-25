"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Strategy, StrategyType } from "@/types/strategy"
import type { StrategyConfig } from "@/types/strategy"
import type { CryptoData } from "@/types/crypto"

interface StrategyConfigProps {
  cryptoData: CryptoData[]
  onStrategyChange: (strategy: Strategy) => void
  strategy: Strategy | null
}

export default function StrategyConfig({ cryptoData, onStrategyChange, strategy }: StrategyConfigProps) {
  const [selectedType, setSelectedType] = useState<StrategyType>(strategy?.config.type || 'DCA');

  const handleConfigChange = (updates: Partial<StrategyConfig>) => {
    if (!strategy) return;
    
    const newConfig = { ...strategy.config, ...updates };
    onStrategyChange({ ...strategy, config: newConfig as StrategyConfig });
  };

  const renderStrategyFields = () => {
    switch (selectedType) {
      case 'DCA':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="dca-amount">Investment Amount (USD)</Label>
              <Input
                id="dca-amount"
                type="number"
                value={(strategy?.config as any)?.amount || ""}
                onChange={(e) => handleConfigChange({ amount: parseFloat(e.target.value) })}
                min="0"
                step="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dca-interval">Interval (hours)</Label>
              <Input
                id="dca-interval"
                type="number"
                value={(strategy?.config as any)?.interval || ""}
                onChange={(e) => handleConfigChange({ interval: parseFloat(e.target.value) })}
                min="1"
                step="1"
              />
            </div>
          </>
        );

      case 'MOVING_AVERAGE':
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading Strategy</CardTitle>
        <CardDescription>Configure your automated trading strategy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="strategy-enabled">Enable Strategy</Label>
          <Switch
            id="strategy-enabled"
            checked={strategy?.config.enabled || false}
            onCheckedChange={(checked) => handleConfigChange({ enabled: checked })}
          />
        </div>

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
              {cryptoData.map((crypto) => (
                <SelectItem key={crypto.id} value={crypto.id}>
                  {crypto.name} ({crypto.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {renderStrategyFields()}
      </CardContent>
    </Card>
  );
}