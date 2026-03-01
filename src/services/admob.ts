import { settingsManager } from '../config/index.js';
import type { IAdMobAdUnit, IAdMobApp, TAdFormat } from '../types/index.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ADMOB_API_BASE = 'https://admob.googleapis.com/v1beta';
const ADMOB_SCOPES = [
  'https://www.googleapis.com/auth/admob.monetization',
  'https://www.googleapis.com/auth/admob.readonly',
];
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

class AdMobService {
  getAuthUrl(clientId: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: ADMOB_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeAuthCode(authCode: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const admobConfig = settingsManager.getAdMobConfig();
    if (!admobConfig?.clientId || !admobConfig?.clientSecret) {
      throw new Error('AdMob OAuth credentials not configured. Run configure_admob first.');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: authCode,
        client_id: admobConfig.clientId,
        client_secret: admobConfig.clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error_description?: string };
      throw new Error(`Token exchange failed: ${error.error_description ?? response.statusText}`);
    }

    const data = (await response.json()) as { access_token: string; refresh_token: string; expires_in: number };
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  private async refreshAccessToken(): Promise<string> {
    const admobConfig = settingsManager.getAdMobConfig();
    if (!admobConfig?.refreshToken) {
      throw new Error('AdMob not authenticated. Run admob_auth first.');
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: admobConfig.refreshToken,
        client_id: admobConfig.clientId,
        client_secret: admobConfig.clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error_description?: string };
      throw new Error(`Token refresh failed: ${error.error_description ?? response.statusText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    settingsManager.updateAdMobTokens(data.access_token, undefined, data.expires_in);
    return data.access_token;
  }

  private async getAccessToken(): Promise<string> {
    const admobConfig = settingsManager.getAdMobConfig();
    if (!admobConfig?.accessToken && !admobConfig?.refreshToken) {
      throw new Error('AdMob not authenticated. Run configure_admob and admob_auth first.');
    }

    const now = Date.now();
    if (admobConfig.accessToken && admobConfig.tokenExpiry && admobConfig.tokenExpiry > now) {
      return admobConfig.accessToken;
    }

    return this.refreshAccessToken();
  }

  private async apiRequest<T>(endpoint: string, method: string = 'GET', body?: Record<string, unknown>): Promise<T> {
    const accessToken = await this.getAccessToken();

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${ADMOB_API_BASE}${endpoint}`, options);

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(`AdMob API error (${response.status}): ${error.error?.message ?? response.statusText}`);
    }

    return (await response.json()) as T;
  }

  async getAccountId(): Promise<string> {
    const admobConfig = settingsManager.getAdMobConfig();
    if (admobConfig?.accountId) {
      return admobConfig.accountId;
    }

    const data = await this.apiRequest<{ account: Array<{ name: string; publisherId: string }> }>('/accounts');
    if (!data.account || data.account.length === 0) {
      throw new Error('No AdMob account found. Create one at https://admob.google.com');
    }

    const accountName = data.account[0].name;
    settingsManager.updateAdMobAccountId(accountName);
    return accountName;
  }

  async listApps(): Promise<IAdMobApp[]> {
    const accountId = await this.getAccountId();
    const data = await this.apiRequest<{ apps?: IAdMobApp[] }>(`/${accountId}/apps`);
    return data.apps ?? [];
  }

  async listAdUnits(appId?: string): Promise<IAdMobAdUnit[]> {
    const accountId = await this.getAccountId();
    let endpoint = `/${accountId}/adUnits`;
    if (appId) {
      endpoint += `?filter=app_id=${appId}`;
    }
    const data = await this.apiRequest<{ adUnits?: IAdMobAdUnit[] }>(endpoint);
    return data.adUnits ?? [];
  }

  async createAdUnit(appId: string, displayName: string, adFormat: TAdFormat): Promise<IAdMobAdUnit> {
    const accountId = await this.getAccountId();
    const body: Record<string, unknown> = {
      adFormat,
      displayName,
      appId,
    };

    if (adFormat === 'REWARDED') {
      body.rewardSettings = {
        unitAmount: 1,
        unitType: 'reward',
      };
    }

    const adUnit = await this.apiRequest<IAdMobAdUnit>(`/${accountId}/adUnits`, 'POST', body);
    return adUnit;
  }

  generateIntegrationCode(
    platform: 'ios' | 'android' | 'both',
    iosAppId: string,
    androidAppId: string,
    adUnits: Array<{ id: string; format: TAdFormat; name: string }>,
  ): {
    installCommand: string;
    appConfig: string;
    componentCode: Record<string, string>;
  } {
    const installCommand = 'npx expo install react-native-google-mobile-ads expo-build-properties expo-tracking-transparency';

    let appConfig = `// app.json or app.config.ts - react-native-google-mobile-ads configuration\n`;
    appConfig += `{\n`;
    appConfig += `  "react-native-google-mobile-ads": {\n`;
    if (platform === 'ios' || platform === 'both') {
      appConfig += `    "ios_app_id": "${iosAppId}",\n`;
    }
    if (platform === 'android' || platform === 'both') {
      appConfig += `    "android_app_id": "${androidAppId}",\n`;
    }
    appConfig += `    "delay_app_measurement_init": true,\n`;
    appConfig += `    "user_tracking_usage_description": "This identifier will be used to deliver personalized ads to you."\n`;
    appConfig += `  }\n`;
    appConfig += `}`;

    const componentCode: Record<string, string> = {};

    for (const unit of adUnits) {
      switch (unit.format) {
        case 'BANNER':
          componentCode[`Ad${unit.name}Banner.tsx`] = this.generateBannerCode(unit.id, unit.name);
          break;
        case 'INTERSTITIAL':
          componentCode[`use${unit.name}Interstitial.ts`] = this.generateInterstitialCode(unit.id, unit.name);
          break;
        case 'REWARDED':
          componentCode[`use${unit.name}Rewarded.ts`] = this.generateRewardedCode(unit.id, unit.name);
          break;
        case 'APP_OPEN':
          componentCode[`use${unit.name}AppOpen.ts`] = this.generateAppOpenCode(unit.id, unit.name);
          break;
      }
    }

    return { installCommand, appConfig, componentCode };
  }

  private generateBannerCode(adUnitId: string, name: string): string {
    return `import React from 'react';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const AD_UNIT_ID = __DEV__ ? TestIds.ADAPTIVE_BANNER : '${adUnitId}';

export function Ad${name}Banner(): React.JSX.Element {
  return (
    <BannerAd
      unitId={AD_UNIT_ID}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  );
}
`;
  }

  private generateInterstitialCode(adUnitId: string, name: string): string {
    return `import { useEffect, useState } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

const AD_UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : '${adUnitId}';
const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

export function use${name}Interstitial(): { isLoaded: boolean; show: () => void } {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setIsLoaded(true);
    });
    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setIsLoaded(false);
      interstitial.load();
    });

    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  const show = (): void => {
    if (isLoaded) {
      interstitial.show();
    }
  };

  return { isLoaded, show };
}
`;
  }

  private generateRewardedCode(adUnitId: string, name: string): string {
    return `import { useEffect, useState } from 'react';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import type { RewardedAdReward } from 'react-native-google-mobile-ads';

const AD_UNIT_ID = __DEV__ ? TestIds.REWARDED : '${adUnitId}';
const rewarded = RewardedAd.createForAdRequest(AD_UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

export function use${name}Rewarded(): {
  isLoaded: boolean;
  show: () => void;
  reward: RewardedAdReward | null;
} {
  const [isLoaded, setIsLoaded] = useState(false);
  const [reward, setReward] = useState<RewardedAdReward | null>(null);

  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsLoaded(true);
    });
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (earnedReward: RewardedAdReward) => {
        setReward(earnedReward);
        setIsLoaded(false);
        rewarded.load();
      },
    );

    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
    };
  }, []);

  const show = (): void => {
    if (isLoaded) {
      rewarded.show();
    }
  };

  return { isLoaded, show, reward };
}
`;
  }

  private generateAppOpenCode(adUnitId: string, name: string): string {
    return `import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AppOpenAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import type { AppStateStatus } from 'react-native';

const AD_UNIT_ID = __DEV__ ? TestIds.APP_OPEN : '${adUnitId}';

export function use${name}AppOpen(): { isLoaded: boolean } {
  const [isLoaded, setIsLoaded] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const appOpenAd = AppOpenAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubscribeLoaded = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
      setIsLoaded(true);
    });
    const unsubscribeClosed = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      setIsLoaded(false);
      appOpenAd.load();
    });

    appOpenAd.load();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isLoaded) {
          appOpenAd.show();
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      subscription.remove();
    };
  }, [isLoaded]);

  return { isLoaded };
}
`;
  }
}

export const admobService = new AdMobService();
