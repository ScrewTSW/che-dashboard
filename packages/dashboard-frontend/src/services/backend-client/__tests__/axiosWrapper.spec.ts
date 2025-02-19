/*
 * Copyright (c) 2018-2023 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import mockAxios, { AxiosInstance } from 'axios';

import {
  AxiosWrapper,
  bearerTokenAuthorizationIsRequiredErrorMsg,
} from '@/services/backend-client/axiosWrapper';

// mute console logs
console.log = jest.fn();
console.warn = jest.fn();

describe('axiosWrapper', () => {
  let axiosInstance: AxiosInstance;
  let axiosGetMock: jest.Mock;
  let axiosGetSpy: jest.SpyInstance;

  beforeEach(() => {
    axiosInstance = mockAxios;
    axiosGetMock = jest.fn();
    axiosInstance.get = axiosGetMock;
    axiosGetSpy = jest.spyOn(axiosInstance, 'get');
  });

  it('should retry 0 time with Bearer Token Authorization is required error message', async () => {
    const expectedData = { data: 'some-data' };
    axiosGetMock.mockReturnValue(new Promise(resolve => resolve(expectedData)));

    const result = await new AxiosWrapper(
      axiosInstance,
      bearerTokenAuthorizationIsRequiredErrorMsg,
    ).get('some-url');

    expect(result).toEqual(expectedData);
    expect(axiosGetSpy).toBeCalledTimes(1);
  });

  it('should retry 0 time without specifi error message', async () => {
    const expectedData = { data: 'some-data' };
    axiosGetMock.mockReturnValue(new Promise(resolve => resolve(expectedData)));

    const result = await new AxiosWrapper(axiosInstance).get('some-url');

    expect(result).toEqual(expectedData);
    expect(axiosGetSpy).toBeCalledTimes(1);
  });

  it('should retry 1 time with Bearer Token Authorization is required error message', async () => {
    const expectedData = { data: 'some-data' };
    axiosGetMock
      .mockRejectedValueOnce(new Error(bearerTokenAuthorizationIsRequiredErrorMsg))
      .mockReturnValue(new Promise(resolve => resolve(expectedData)));

    const result = await new AxiosWrapper(
      axiosInstance,
      bearerTokenAuthorizationIsRequiredErrorMsg,
    ).get('some-url');

    expect(result).toEqual(expectedData);
    expect(axiosGetSpy).toBeCalledTimes(2);
  });

  it('should retry 1 time without specif error message', async () => {
    const expectedData = { data: 'some-data' };
    axiosGetMock
      .mockRejectedValueOnce(new Error('some error message'))
      .mockReturnValue(new Promise(resolve => resolve(expectedData)));

    const result = await new AxiosWrapper(axiosInstance).get('some-url');

    expect(result).toEqual(expectedData);
    expect(axiosGetSpy).toBeCalledTimes(2);
  });

  it('should retry 2 times with Bearer Token Authorization is required error message', async () => {
    const expectedData = { data: 'some-data' };
    axiosGetMock
      .mockRejectedValueOnce(new Error(bearerTokenAuthorizationIsRequiredErrorMsg))
      .mockRejectedValueOnce(new Error(bearerTokenAuthorizationIsRequiredErrorMsg))
      .mockReturnValue(new Promise(resolve => resolve(expectedData)));

    const result = await new AxiosWrapper(
      axiosInstance,
      bearerTokenAuthorizationIsRequiredErrorMsg,
    ).get('some-url');

    expect(result).toEqual(expectedData);
    expect(axiosGetSpy).toBeCalledTimes(3);
  });

  it('should retry 2 times without specific error message', async () => {
    const expectedData = { data: 'some-data' };
    axiosGetMock
      .mockRejectedValueOnce(new Error('error 1'))
      .mockRejectedValueOnce(new Error('error 2'))
      .mockReturnValue(new Promise(resolve => resolve(expectedData)));

    const result = await new AxiosWrapper(axiosInstance).get('some-url');

    expect(result).toEqual(expectedData);
    expect(axiosGetSpy).toBeCalledTimes(3);
  });

  it('should fail after 3 times with Bearer Token Authorization is required error message', async () => {
    axiosGetMock
      .mockRejectedValueOnce(new Error(bearerTokenAuthorizationIsRequiredErrorMsg))
      .mockRejectedValueOnce(new Error(bearerTokenAuthorizationIsRequiredErrorMsg))
      .mockRejectedValueOnce(new Error(bearerTokenAuthorizationIsRequiredErrorMsg))
      .mockRejectedValue(new Error(bearerTokenAuthorizationIsRequiredErrorMsg));

    try {
      await new AxiosWrapper(axiosInstance, bearerTokenAuthorizationIsRequiredErrorMsg).get(
        'some-url',
      );
      fail('should fail');
    } catch (e: any) {
      expect(e.message).toEqual(bearerTokenAuthorizationIsRequiredErrorMsg);
      expect(axiosGetSpy).toBeCalledTimes(4);
    }
  });

  it('should fail after 3 times without specific error message', async () => {
    axiosGetMock
      .mockRejectedValueOnce(new Error('error 1'))
      .mockRejectedValueOnce(new Error('error 2'))
      .mockRejectedValueOnce(new Error('error 3'))
      .mockRejectedValue(new Error('error 4'));

    try {
      await new AxiosWrapper(axiosInstance).get('some-url');
      fail('should fail');
    } catch (e: any) {
      expect(e.message).toEqual('error 4');
      expect(axiosGetSpy).toBeCalledTimes(4);
    }
  });
});
