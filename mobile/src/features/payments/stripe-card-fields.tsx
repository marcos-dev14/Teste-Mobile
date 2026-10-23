import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'

import { useTheme, type Theme } from '@/ui'

/** Resultado de `confirmCardPayment` no Stripe.js (sem tratar 3DS: isso fica com o SDK nativo). */
export type CardConfirmResult =
  | { status: string }
  | { error: { code?: string; declineCode?: string; type?: string; message?: string } }

export interface StripeCardFieldsHandle {
  confirm: (clientSecret: string, name: string) => Promise<CardConfirmResult>
}

interface Props {
  publishableKey: string
  disabled?: boolean
  /** Os três campos (número, validade, CVC) estão completos e válidos. */
  onCompleteChange: (complete: boolean) => void
  /** Stripe.js não carregou (sem internet, bloqueio). */
  onLoadError: () => void
}

type Message =
  | { type: 'height'; value: number }
  | { type: 'ready' }
  | { type: 'complete'; value: boolean }
  | { type: 'loadError' }
  | ({ type: 'result'; id: number } & CardConfirmResult)

/** Origem fictícia da página: só serve de base HTTPS para o Stripe.js; nada é carregado dela. */
const BASE_URL = 'https://vesti.app/card'
const STRIPE_JS = 'https://js.stripe.com/v3/'

/**
 * Número, validade e CVC em campos separados do Stripe.js (Elements). Cada campo é um iframe do
 * próprio Stripe: o número digitado não passa pelo JS do app nem pela nossa API (PCI SAQ A).
 * Títulos, fontes e cores seguem o tema do app.
 */
export const StripeCardFields = forwardRef<StripeCardFieldsHandle, Props>(function StripeCardFields(
  { publishableKey, disabled = false, onCompleteChange, onLoadError },
  ref,
) {
  const theme = useTheme()
  const webView = useRef<WebView>(null)
  const pending = useRef(new Map<number, (result: CardConfirmResult) => void>())
  const sequence = useRef(0)
  const [height, setHeight] = useState(176)
  const html = useMemo(() => buildHtml(publishableKey, theme), [publishableKey, theme])

  useImperativeHandle(ref, () => ({
    confirm: (clientSecret, name) =>
      new Promise((resolve) => {
        sequence.current += 1
        const id = sequence.current
        pending.current.set(id, resolve)
        webView.current?.injectJavaScript(`window.vestiConfirm(${JSON.stringify({ id, clientSecret, name })}); true;`)
      }),
  }))

  const onMessage = (event: WebViewMessageEvent) => {
    let message: Message
    try {
      message = JSON.parse(event.nativeEvent.data) as Message
    } catch {
      return
    }
    if (message.type === 'height') setHeight(Math.ceil(message.value))
    else if (message.type === 'complete') onCompleteChange(message.value)
    else if (message.type === 'loadError') onLoadError()
    else if (message.type === 'result') {
      const { id, type: _type, ...result } = message
      pending.current.get(id)?.(result as CardConfirmResult)
      pending.current.delete(id)
    }
  }

  return (
    <View style={{ height }} pointerEvents={disabled ? 'none' : 'auto'} testID="card-fields">
      <WebView
        ref={webView}
        source={{ html, baseUrl: BASE_URL }}
        originWhitelist={['https://*']}
        onMessage={onMessage}
        onError={onLoadError}
        // A página é nossa; só os iframes do Stripe carregam. Navegação no quadro principal é bloqueada.
        onShouldStartLoadWithRequest={(request) => !request.isTopFrame || request.url.startsWith(BASE_URL) || request.url === 'about:blank'}
        setSupportMultipleWindows={false}
        javaScriptCanOpenWindowsAutomatically={false}
        scrollEnabled={false}
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        style={{ backgroundColor: 'transparent' }}
        containerStyle={{ backgroundColor: 'transparent' }}
      />
    </View>
  )
})

function buildHtml(publishableKey: string, theme: Theme): string {
  const c = theme.colors
  const config = {
    publishableKey,
    style: {
      base: {
        color: c.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '16px',
        iconColor: c.textMuted,
        '::placeholder': { color: c.textMuted },
      },
      invalid: { color: c.danger, iconColor: c.danger },
    },
  }
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap">
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; background: transparent; font-family: Inter, system-ui, sans-serif; }
  #form { display: flex; flex-direction: column; gap: ${theme.space.md}px; padding: 2px 0; }
  .row { display: flex; gap: ${theme.space.sm}px; }
  .row > .group { flex: 1; min-width: 0; }
  .group { display: flex; flex-direction: column; gap: ${theme.space.xxs}px; }
  label { font-size: 13px; line-height: 18px; font-weight: 500; color: ${c.textMuted}; }
  .field {
    height: ${theme.layout.fieldHeight}px; display: flex; align-items: center; padding: 0 ${theme.space.md}px;
    border: 1.5px solid ${c.border}; border-radius: ${theme.radius.md}px; background: ${c.surface};
  }
  .field > div { width: 100%; }
  .field.StripeElement--focus { border-color: ${c.primary}; }
  .field.StripeElement--invalid { border-color: ${c.danger}; }
  .error { min-height: 0; font-size: 12px; line-height: 16px; color: ${c.danger}; }
  .error:empty { display: none; }
</style>
</head>
<body>
<div id="form">
  <div class="group">
    <label for="number">Número do cartão</label>
    <div id="number" class="field"></div>
    <div id="number-error" class="error" role="alert"></div>
  </div>
  <div class="row">
    <div class="group">
      <label for="expiry">Validade</label>
      <div id="expiry" class="field"></div>
      <div id="expiry-error" class="error" role="alert"></div>
    </div>
    <div class="group">
      <label for="cvc">CVC</label>
      <div id="cvc" class="field"></div>
      <div id="cvc-error" class="error" role="alert"></div>
    </div>
  </div>
</div>
<script>
  (function () {
    var config = ${JSON.stringify(config)};
    function post(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); }
    function reportHeight() { post({ type: 'height', value: document.getElementById('form').getBoundingClientRect().height + 4 }); }

    var script = document.createElement('script');
    script.src = '${STRIPE_JS}';
    script.onerror = function () { post({ type: 'loadError' }); };
    script.onload = function () {
      var stripe = Stripe(config.publishableKey, { locale: 'pt-BR' });
      var elements = stripe.elements({ fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap' }], locale: 'pt-BR' });
      var options = { style: config.style };
      var number = elements.create('cardNumber', Object.assign({ showIcon: true, disableLink: true, placeholder: '0000 0000 0000 0000' }, options));
      var expiry = elements.create('cardExpiry', Object.assign({ placeholder: 'MM/AA' }, options));
      var cvc = elements.create('cardCvc', Object.assign({ placeholder: '123' }, options));
      var state = { number: false, expiry: false, cvc: false };

      [['number', number], ['expiry', expiry], ['cvc', cvc]].forEach(function (entry) {
        var name = entry[0], element = entry[1];
        element.mount('#' + name);
        element.on('change', function (event) {
          state[name] = event.complete;
          document.getElementById(name + '-error').textContent = event.error ? event.error.message : '';
          post({ type: 'complete', value: state.number && state.expiry && state.cvc });
          reportHeight();
        });
      });
      number.on('ready', function () { post({ type: 'ready' }); reportHeight(); });

      // 3DS não roda aqui (handleActions: false): o app o apresenta com o SDK nativo, em tela cheia.
      window.vestiConfirm = function (request) {
        stripe
          .confirmCardPayment(request.clientSecret, { payment_method: { card: number, billing_details: { name: request.name } } }, { handleActions: false })
          .then(function (result) {
            if (result.error) {
              var e = result.error;
              post({ type: 'result', id: request.id, error: { code: e.code, declineCode: e.decline_code, type: e.type, message: e.message } });
            } else {
              post({ type: 'result', id: request.id, status: result.paymentIntent.status });
            }
          })
          .catch(function () { post({ type: 'result', id: request.id, error: { code: 'network_error' } }); });
      };
    };
    document.head.appendChild(script);
    reportHeight();
  })();
</script>
</body>
</html>`
}
