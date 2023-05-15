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

import { fetchRegistryMetadata, resolveLinks, resolveTags, updateObjectLinks } from '../devfiles';
import SessionStorageService, { SessionStorageKey } from '../../session-storage';

const mockFetchData = jest.fn();
jest.mock('../fetchData', () => {
  return {
    fetchData: async (href: string) => {
      return mockFetchData(href);
    },
  };
});

describe('fetch registry metadata', () => {
  const mockSessionStorageServiceGet = jest.fn();
  const mockSessionStorageServiceUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    SessionStorageService.update = mockSessionStorageServiceUpdate;
    SessionStorageService.get = mockSessionStorageServiceGet;
  });

  describe('internal registry', () => {
    const baseUrl = 'http://this.is.my.base.url';

    it('should fetch registry metadata', async () => {
      const metadata = {
        displayName: 'java-maven',
        icon: '/icon.png',
        tags: ['Java'],
        links: {
          self: '/devfiles/java-maven/1.2.0',
        },
      } as che.DevfileMetaData;
      mockFetchData.mockResolvedValue([metadata]);

      const resolved = await fetchRegistryMetadata(baseUrl, false);

      expect(mockSessionStorageServiceGet).not.toHaveBeenCalled();
      expect(mockFetchData).toHaveBeenCalledTimes(1);
      expect(mockFetchData).toBeCalledWith('http://this.is.my.base.url/devfiles/index.json');
      expect(mockSessionStorageServiceUpdate).not.toHaveBeenCalled();
      expect(resolved).toEqual([metadata]);
    });
  });
  describe('external registry', () => {
    const baseUrl = 'https://registry.devfile.io/';

    it('should fetch registry metadata', async () => {
      const metadata = {
        displayName: 'java-maven',
        icon: '/icon.png',
        tags: ['Java'],
        links: {
          self: 'devfile-catalog/java-maven:1.2.0',
        },
      };
      mockFetchData.mockResolvedValue([metadata]);
      mockSessionStorageServiceGet.mockReturnValue(undefined);

      const resolved = await fetchRegistryMetadata(baseUrl, true);

      expect(mockSessionStorageServiceGet).toHaveBeenCalledWith(
        SessionStorageKey.EXTERNAL_REGISTRIES,
      );
      expect(mockFetchData).toBeCalledWith('https://registry.devfile.io/index');
      expect(mockSessionStorageServiceUpdate).toHaveBeenCalledWith(
        SessionStorageKey.EXTERNAL_REGISTRIES,
        JSON.stringify({
          'https://registry.devfile.io/index': { metadata: [metadata] },
        }),
      );
      expect(resolved).toEqual([metadata]);
    });

    it('should not fetch if registry metadata exist', async () => {
      const metadata = {
        displayName: 'java-maven',
        icon: '/icon.png',
        tags: ['Java'],
        links: {
          self: 'devfile-catalog/java-maven:1.2.0',
        },
      };
      mockFetchData.mockResolvedValue([metadata]);
      mockSessionStorageServiceGet.mockReturnValue(
        JSON.stringify({
          'https://registry.devfile.io/index': { metadata: [metadata] },
        }),
      );

      const resolved = await fetchRegistryMetadata(baseUrl, true);

      expect(mockSessionStorageServiceGet).toHaveBeenCalledWith(
        SessionStorageKey.EXTERNAL_REGISTRIES,
      );
      expect(mockFetchData).not.toBeCalled();
      expect(mockSessionStorageServiceUpdate).not.toBeCalled();
      expect(resolved).toEqual([metadata]);
    });
  });
});

describe('devfile tags', () => {
  describe('internal registry', () => {
    const baseUrl = 'http://this.is.my.base.url';

    it('should return tags without changes', () => {
      const metadata = {
        displayName: 'java-maven',
        icon: '/icon.png',
        tags: ['Java'],
        links: {
          self: '/devfiles/java-maven/1.2.0',
        },
      } as che.DevfileMetaData;

      const resolved = resolveTags(metadata, baseUrl, false);
      expect(resolved).toEqual(metadata.tags);
    });
  });
  describe('external registry', () => {
    const baseUrl = 'https://registry.devfile.io/';

    it('should add a new tag from the base URL', () => {
      const metadata = {
        displayName: 'java-maven',
        icon: '/icon.png',
        tags: ['Java'],
        links: {
          self: 'devfile-catalog/java-maven:1.2.0',
        },
      };

      const resolved = resolveTags(metadata, baseUrl, true);
      expect(resolved).not.toEqual(metadata.tags);
      expect(resolved).toEqual(['Java', 'Devfile.io']);
    });
  });
});

describe('devfile links', () => {
  const baseUrl = 'http://this.is.my.base.url';

  describe('internal registry', () => {
    it('should update links that are not absolute', () => {
      const metadata = {
        displayName: 'nodejs-react',
        icon: '/icon.png',
        tags: [],
        links: {
          v2: 'https://github.com/che-samples/nodejs-react-redux/tree/devfilev2',
          self: '/devfiles/nodejs-react/devfile.yaml',
          devWorkspaces: {
            'eclipse/che-theia/latest': '/devfiles/nodejs-react/devworkspace-che-theia-latest.yaml',
            'eclipse/che-theia/next': '/devfiles/nodejs-react/devworkspace-che-theia-next.yaml',
          },
        },
      } as che.DevfileMetaData;

      const resolved = resolveLinks(metadata, baseUrl, false);
      // this one is not updated as already absolute
      expect(resolved.v2).toBe('https://github.com/che-samples/nodejs-react-redux/tree/devfilev2');
      expect(resolved.self).toBe(`${baseUrl}/devfiles/nodejs-react/devfile.yaml`);
      expect(resolved.devWorkspaces['eclipse/che-theia/latest']).toBe(
        `${baseUrl}/devfiles/nodejs-react/devworkspace-che-theia-latest.yaml`,
      );
      expect(resolved.devWorkspaces['eclipse/che-theia/next']).toBe(
        `${baseUrl}/devfiles/nodejs-react/devworkspace-che-theia-next.yaml`,
      );
    });
  });

  describe('external registry', () => {
    const baseUrl = 'https://registry.devfile.io/';

    it('should generate a "v2" link', () => {
      const metadata = {
        displayName: 'java-maven',
        icon: '/icon.png',
        tags: [],
        links: {
          self: 'devfile-catalog/java-maven:1.2.0',
        },
      } as che.DevfileMetaData;

      const resolved = resolveLinks(metadata, baseUrl, true);
      expect(resolved.v2).toBe('https://registry.devfile.io/devfiles/java-maven/1.2.0');
      expect(resolved.self).toBeUndefined;
    });
  });

  it('should update links', () => {
    const object = '/devfile/foo.yaml';
    const updated = updateObjectLinks(object, baseUrl);

    expect(updated).toBe(`${baseUrl}/devfile/foo.yaml`);
  });

  it('should not update absolute link', () => {
    const object = 'http://asbolute.link';
    const updated = updateObjectLinks(object, baseUrl);

    // this one is not updated as already absolute
    expect(updated).toBe('http://asbolute.link');
  });

  it('should update complex objects', () => {
    const object = {
      link1: '/devfile/foo.yaml',
      links: {
        link2: '/devfile/bar.yaml',
      },
      otherLinks: {
        subLinks: {
          subSubLinks: {
            link3: '/devfile/baz.yaml',
          },
        },
      },
    };
    const updated = updateObjectLinks(object, baseUrl);

    // updating all links
    expect(updated.link1).toBe(`${baseUrl}/devfile/foo.yaml`);
    expect(updated.links.link2).toBe(`${baseUrl}/devfile/bar.yaml`);
    expect(updated.otherLinks.subLinks.subSubLinks.link3).toBe(`${baseUrl}/devfile/baz.yaml`);
  });
});
