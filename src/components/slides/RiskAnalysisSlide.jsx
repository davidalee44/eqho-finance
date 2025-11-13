import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { ReportSlide } from '../ReportSlide';

export const RiskAnalysisSlide = ({ risks }) => {
  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getSeverityIcon = (severity) => {
    return severity === 'critical' ? AlertCircle : AlertTriangle;
  };

  return (
    <ReportSlide
      title="Risk Analysis"
      description="Critical areas requiring immediate attention"
      variant="danger"
    >
      <div className="space-y-6">
        {risks.map((risk, idx) => {
          const Icon = getSeverityIcon(risk.severity);
          return (
            <Card 
              key={idx} 
              className={`border-l-8 border-2 ${
                risk.severity === 'critical' ? 'border-l-red-500 bg-red-50' :
                risk.severity === 'high' ? 'border-l-orange-500 bg-orange-50' :
                'border-l-yellow-500 bg-yellow-50'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`h-6 w-6 mt-1 ${
                      risk.severity === 'critical' ? 'text-red-600' :
                      risk.severity === 'high' ? 'text-orange-600' :
                      'text-yellow-600'
                    }`} />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`${getSeverityColor(risk.severity)} text-base px-3 py-1`}>
                          {risk.severity.toUpperCase()}
                        </Badge>
                        <CardTitle className="text-xl">{risk.title}</CardTitle>
                      </div>
                      <CardDescription className="text-base">
                        {risk.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-muted-foreground mb-1">Key Metric</p>
                    <p className="text-xl font-bold">{risk.metric}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Summary Call-to-Action */}
      <Card className="mt-6 bg-destructive/10 border-2 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-6 w-6" />
            Immediate Action Required
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Without immediate cost reduction of $30K+/month, the company will face severe cash constraints 
            within Q1 2026. Priority areas: Contract labor, marketing spend, and SaaS audit.
          </CardDescription>
        </CardHeader>
      </Card>
    </ReportSlide>
  );
};

