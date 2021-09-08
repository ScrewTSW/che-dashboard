/*
 * Copyright (c) 2018-2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { DevWorkspaceClient, IDevWorkspace, IDevWorkspaceCallbacks } from '../';
import { conditionalTest, isIntegrationTestEnabled } from './utils/suite';
import { createKubeConfig } from './utils/helper';
import { fail } from 'assert';
import * as k8s from '@kubernetes/client-node';
import { helpers } from '@eclipse-che/common';

describe('Kubernetes API integration testing against cluster', () => {

  describe('Test Kubernetes errors', () => {
    conditionalTest('test when Custom API does not exist', isIntegrationTestEnabled, async (done: any) => {
      let customObjectAPI = createKubeConfig().makeApiClient(k8s.CustomObjectsApi);
      try {
        const resp = await customObjectAPI.getNamespacedCustomObject(
          'non-existing-group',
          'v1',
          'any-namespace',
          'subresource',
          'name'
        );
        fail('request to non-existing Custom API should fail');
      } catch (e) {
        let errorMessage = 'unable get non-existing: ' + helpers.errors.getMessage(e);
        expect(errorMessage).toBe('unable get non-existing: 404 page not found\n');
      }
      done();
    }, 1000);

    conditionalTest('test when unauthorized', isIntegrationTestEnabled, async (done: any) => {
      const kc = createKubeConfig();
      let currentUser = kc.getCurrentUser();
      if (!currentUser) {
        throw 'current user is not present in kubeconfig';
      }
      (currentUser as any).token = '';

      const dwClient = new DevWorkspaceClient(kc);
      try {
        await dwClient.devworkspaceApi.getByName('any', 'non-existing');
        fail('devworkspace is expected not to be found');
      } catch (e) {
        expect((e as Error).message).toBe('unable to get devworkspace any/non-existing: devworkspaces.workspace.devfile.io "non-existing" is forbidden: User "system:anonymous" ' +
          'cannot get resource "devworkspaces" in API group "workspace.devfile.io" in the namespace "any"');
      }
      done();
    }, 1000);

    conditionalTest('test watch when unauthorized', isIntegrationTestEnabled, async (done: any) => {
      const kc = createKubeConfig();
      let currentUser = kc.getCurrentUser();
      if (!currentUser) {
        throw 'current user is not present in kubeconfig';
      }
      (currentUser as any).token = '';

      const dwClient = new DevWorkspaceClient(kc);
      const err: Promise<string> = new Promise((resolve, reject) => {
        try {
          dwClient.devworkspaceApi.watchInNamespace('any', '', {
            onModified: (workspace: IDevWorkspace) => {
              resolve('on modified is not expected to be called');
            },
            onDeleted: (workspaceId: string) => {
              resolve('on deleted is not expected to be called');
            },
            onAdded: (workspace: IDevWorkspace) => {
              resolve('on added is not expected to be called');
            },
            onError: (error: string) => {
              resolve(error);
            }
          });
        } catch (e) {
          fail('unexpected error is thrown while watching: ' + e);
        }
      });
      expect((await err)).toBe('Error: Forbidden');
      done();
    }, 1000);

    conditionalTest('test when request is not processed', isIntegrationTestEnabled, async (done: any) => {
      const kc = createKubeConfig();
      let currentCluster = kc.getCurrentCluster();
      if (!currentCluster) {
        throw 'current cluster is not present in kubeconfig';
      }
      (currentCluster as any).server = 'http://non-existing-k8s.127.0.0.1/';

      const dwClient = new DevWorkspaceClient(kc);
      try {
        await dwClient.devworkspaceApi.getByName('any', 'non-existing');
        fail('devworkspace is expected not to be found');
      } catch (e) {
        expect((e as Error).message).toBe('unable to get devworkspace any/non-existing: no response available due network issue.');
      }
      done();
    }, 60000);
  });
});
