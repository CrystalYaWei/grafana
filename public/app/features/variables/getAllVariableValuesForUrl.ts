import CryptoAES from 'crypto-js/aes';
import CryptoENC from 'crypto-js/enc-utf8';

import { ScopedVars, UrlQueryMap } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';

import { variableAdapters } from './adapters';

export function getVariablesUrlParams(scopedVars?: ScopedVars): UrlQueryMap {
  const params: UrlQueryMap = {};
  const variables = getTemplateSrv().getVariables();

  for (let i = 0; i < variables.length; i++) {
    const variable = variables[i];
    if (scopedVars && scopedVars[variable.name] !== void 0) {
      if (scopedVars[variable.name].skipUrlSync) {
        continue;
      }
      params['var-' + variable.name] = scopedVars[variable.name].value;
    } else {
      // @ts-ignore
      if (variable.skipUrlSync) {
        continue;
      }

      params['var-' + variable.name] = variableAdapters.get(variable.type).getValueForUrl(variable as any);
      // remember to do urlencode from gcc
      if (variable.name === 'test_id') {
        let encryptText = variableAdapters.get(variable.type).getValueForUrl(variable as any);
        let decryptText = CryptoAES.decrypt(encryptText.toString(), 'GCCxS@x=@Ks');
        let testID = decryptText.toString(CryptoENC);
        params['var-' + variable.name] = testID;
      }
    }
  }

  return params;
}
