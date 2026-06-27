import React, { Component } from 'react';
import {
  ActivityIndicator,
  Button,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import {
  WebView,
  WebViewMessageEvent,
  WebViewProps,
} from 'react-native-webview';
import IdleTimerManager from 'react-native-idle-timer';

const URL_STORAGE_KEY = '@webview_url';

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

interface MyWebComponentProps {
  url: string;
}

class MyWebComponent extends Component<MyWebComponentProps> {
  private handleMessage = (event: WebViewMessageEvent) => {
    console.log('[WebView message]', event.nativeEvent.data);
  };

  private handleError: NonNullable<WebViewProps['onError']> = (event) => {
    const { url, code, description, domain } = event.nativeEvent;
    console.error('[WebView error]', { url, code, description, domain });
  };

  private handleHttpError: NonNullable<WebViewProps['onHttpError']> = (event) => {
    const { url, statusCode, description } = event.nativeEvent;
    console.error('[WebView http error]', { url, statusCode, description });
  };

  private handleLoadStart: NonNullable<WebViewProps['onLoadStart']> = (event) => {
    console.log('[WebView load start]', event.nativeEvent.url);
  };

  private handleLoadEnd: NonNullable<WebViewProps['onLoadEnd']> = (event) => {
    console.log('[WebView load end]', event.nativeEvent.url);
  };

  private handleRenderProcessGone: NonNullable<WebViewProps['onRenderProcessGone']> = (event) => {
    console.error('[WebView render process gone]', event.nativeEvent);
  };

  render() {
    return (
      <WebView
        source={{ uri: this.props.url }}
        onMessage={this.handleMessage}
        onError={this.handleError}
        onHttpError={this.handleHttpError}
        onLoadStart={this.handleLoadStart}
        onLoadEnd={this.handleLoadEnd}
        onRenderProcessGone={this.handleRenderProcessGone}
        webviewDebuggingEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        bounces={false}
        overScrollMode="never"
        style={styles.webView}
      />
    );
  }
}

interface UrlPromptProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

class UrlPrompt extends Component<UrlPromptProps> {
  render() {
    const { value, onChange, onSubmit } = this.props;
    const canSubmit = value.trim().length > 0;

    return (
      <View style={styles.prompt}>
        <Text style={styles.promptTitle}>Enter URL</Text>
        <Text style={styles.promptSubtitle}>
          This app needs a web address to load on first launch.
        </Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="https://example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={canSubmit ? onSubmit : undefined}
        />
        <Button title="Continue" onPress={onSubmit} disabled={!canSubmit} />
      </View>
    );
  }
}

interface AppState {
  url: string | null;
  inputUrl: string;
  loading: boolean;
}

class App extends Component<object, AppState> {
  state: AppState = {
    url: null,
    inputUrl: '',
    loading: true,
  };

  componentDidMount() {
    IdleTimerManager.setIdleTimerDisabled(true);
    this.loadStoredUrl();
  }

  componentWillUnmount() {
    IdleTimerManager.setIdleTimerDisabled(false);
  }

  private loadStoredUrl = async () => {
    try {
      const storedUrl = await AsyncStorage.getItem(URL_STORAGE_KEY);
      this.setState({
        url: storedUrl,
        loading: false,
      });
    } catch (error) {
      console.error('[Storage] failed to load URL', error);
      this.setState({ loading: false });
    }
  };

  private handleUrlSubmit = async () => {
    const { inputUrl } = this.state;
    if (!inputUrl.trim()) {
      return;
    }

    const url = normalizeUrl(inputUrl);

    try {
      await AsyncStorage.setItem(URL_STORAGE_KEY, url);
      this.setState({ url });
    } catch (error) {
      console.error('[Storage] failed to save URL', error);
    }
  };

  render() {
    const { url, inputUrl, loading } = this.state;

    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" />
            </View>
          ) : url ? (
            <MyWebComponent url={url} />
          ) : (
            <UrlPrompt
              value={inputUrl}
              onChange={(value) => this.setState({ inputUrl: value })}
              onSubmit={this.handleUrlSubmit}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  promptTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  promptSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});

export default App;
