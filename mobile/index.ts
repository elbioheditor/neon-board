import 'react-native-url-polyfill/auto';
import React from 'react';
import { registerRootComponent } from 'expo';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import App from './App';

interface BoundaryState {
  hasError: boolean;
  errorText: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  BoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorText: '' };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {
      hasError: true,
      errorText: `${error?.name || 'Error'}: ${error?.message || String(error)}\n\n${error?.stack || ''}`,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Neon Mobile ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return React.createElement(
        View,
        { style: styles.errorContainer },
        React.createElement(
          Text,
          { style: styles.errorTitle },
          '⚠️ Erro detectado no Neon Mobile'
        ),
        React.createElement(
          ScrollView,
          { style: styles.errorBox },
          React.createElement(
            Text,
            { selectable: true, style: styles.errorCode },
            this.state.errorText
          )
        ),
        React.createElement(
          Pressable,
          {
            onPress: () => this.setState({ hasError: false, errorText: '' }),
            style: styles.retryBtn,
          },
          React.createElement(Text, { style: styles.retryText }, 'Tentar Novamente')
        )
      );
    }
    return this.props.children;
  }
}

function Root() {
  return React.createElement(RootErrorBoundary, null, React.createElement(App));
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#07050d',
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 30,
  },
  errorTitle: {
    color: '#fb7185',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  errorBox: {
    flex: 1,
    backgroundColor: '#0d0918',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.35)',
    padding: 12,
    marginBottom: 14,
  },
  errorCode: {
    color: '#fda4af',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  retryBtn: {
    backgroundColor: '#22d3ee',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryText: {
    color: '#04121d',
    fontWeight: '900',
    fontSize: 14,
  },
});

registerRootComponent(Root);
