'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  widgetName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[WIDGET_ERROR_BOUNDARY:${this.props.widgetName || 'Widget'}]`, error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#161618] border border-[#FF453A]/30 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-3 min-h-[180px] shadow-sm">
          <div className="w-10 h-10 rounded-full bg-[#FF453A]/10 text-[#FF453A] flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Couldn&apos;t load this widget</p>
            <p className="text-xs text-[#8E8E93] mt-1 max-w-xs">
              {this.state.error?.message || 'An unexpected error occurred while fetching data.'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={this.handleRetry}
            className="mt-1 flex items-center gap-1.5 text-xs text-white border border-white/10 hover:bg-white/5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
