import { GetParameterCommand } from '@aws-sdk/client-ssm';
import { SDK, SdkForEnvironment } from '../../lib/api';
import { SSMContextProviderPlugin } from '../../lib/context-providers/ssm-parameters';
import { FAKE_CREDENTIAL_CHAIN, MockSdkProvider, mockSSMClient, restoreSdkMocksToDefault } from '../util/mock-sdk';
import { TestIoHost } from '../../../@aws-cdk/tmp-toolkit-helpers/src/api/io/private';

const mockSDK = new (class extends MockSdkProvider {
  public forEnvironment(): Promise<SdkForEnvironment> {
    return Promise.resolve({ sdk: new SDK(FAKE_CREDENTIAL_CHAIN, mockSDK.defaultRegion, {}, new TestIoHost().asHelper("deploy")), didAssumeRole: false });
  }
})();

const mockMsg = {
  debug: jest.fn(),
  info: jest.fn(),
};

beforeEach(() => {
  mockMsg.debug.mockClear();
  mockMsg.info.mockClear();
});

describe('ssmParameters', () => {
  test('returns value', async () => {
    restoreSdkMocksToDefault();
    const provider = new SSMContextProviderPlugin(mockSDK, mockMsg);

    mockSSMClient.on(GetParameterCommand).resolves({
      Parameter: {
        Value: 'bar',
      },
    });

    // WHEN
    const value = await provider.getValue({
      account: '1234',
      region: 'us-east-1',
      parameterName: 'foo',
    });

    expect(value).toEqual('bar');
  });

  test('errors when parameter is not found', async () => {
    restoreSdkMocksToDefault();
    const provider = new SSMContextProviderPlugin(mockSDK, mockMsg);

    const notFound = new Error('Parameter not found');
    notFound.name = 'ParameterNotFound';
    mockSSMClient.on(GetParameterCommand).rejects(notFound);

    // WHEN
    await expect(
      provider.getValue({
        account: '1234',
        region: 'us-east-1',
        parameterName: 'foo',
      })).rejects.toThrow(/SSM parameter not available in account/);
  });
});
