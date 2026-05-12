import React, { Component, ReactNode } from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: COLORS.background,
        }}>
          <Text style={{
            fontSize: 16,
            color: COLORS.textMid,
            textAlign: 'center',
            marginBottom: 20,
          }}>
            Something went wrong loading the app.
          </Text>
          <Text style={{
            fontSize: 14,
            color: COLORS.textMid,
            textAlign: 'center',
          }}>
            Please refresh the page or try again later.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={{
              fontSize: 12,
              color: COLORS.error,
              textAlign: 'center',
              marginTop: 20,
            }}>
              Error: {this.state.error.message}
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}
