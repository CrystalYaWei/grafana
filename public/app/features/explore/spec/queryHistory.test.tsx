import React from 'react';
import { setupExplore, tearDown, waitForExplore } from './helper/setup';
import { deleteQueryHistory, inputQuery, openQueryHistory, runQuery, starQueryHistory } from './helper/interactions';
import { assertQueryHistory, assertQueryHistoryExists, assertQueryHistoryIsStarred } from './helper/assert';
import { makeLogsQueryResponse } from './helper/query';
import { ExploreId } from '../../../types';
import { serializeStateToUrlParam } from '../../../../../packages/grafana-data';

jest.mock('react-virtualized-auto-sizer', () => {
  return {
    __esModule: true,
    default(props: any) {
      return <div>{props.children({ width: 1000 })}</div>;
    },
  };
});

describe('Explore: Query History', () => {
  const USER_INPUT = 'my query';
  const RAW_QUERY = `{"expr":"${USER_INPUT}"}`;

  afterEach(() => {
    tearDown();
  });

  it('adds new query history items after the query is run.', async () => {
    // when Explore is opened
    const { datasources, unmount } = setupExplore();
    (datasources.loki.query as jest.Mock).mockReturnValueOnce(makeLogsQueryResponse());
    await waitForExplore();

    // and a user runs a query and opens query history
    inputQuery(USER_INPUT);
    runQuery();
    await openQueryHistory();

    // the query that was run is in query history
    await assertQueryHistoryExists(RAW_QUERY);

    // when Explore is opened again
    unmount();
    setupExplore({ clearLocalStorage: false });
    await waitForExplore();

    // previously added query is in query history
    await openQueryHistory();
    await assertQueryHistoryExists(RAW_QUERY);
  });

  it('updates the state in both Explore panes', async () => {
    const urlParams = {
      left: serializeStateToUrlParam({
        datasource: 'loki',
        queries: [{ refId: 'A', expr: 'query #1' }],
        range: { from: 'now-1h', to: 'now' },
      }),
      right: serializeStateToUrlParam({
        datasource: 'loki',
        queries: [{ refId: 'A', expr: 'query #2' }],
        range: { from: 'now-1h', to: 'now' },
      }),
    };

    const { datasources } = setupExplore({ urlParams });
    (datasources.loki.query as jest.Mock).mockReturnValue(makeLogsQueryResponse());
    await waitForExplore();
    await waitForExplore(ExploreId.right);

    // queries in history
    await openQueryHistory(ExploreId.left);
    await assertQueryHistory(['{"expr":"query #2"}', '{"expr":"query #1"}'], ExploreId.left);
    await openQueryHistory(ExploreId.right);
    await assertQueryHistory(['{"expr":"query #2"}', '{"expr":"query #1"}'], ExploreId.left);

    // star one one query
    starQueryHistory(1, ExploreId.left);
    await assertQueryHistoryIsStarred([false, true], ExploreId.left);
    await assertQueryHistoryIsStarred([false, true], ExploreId.right);

    deleteQueryHistory(0, ExploreId.left);
    await assertQueryHistory(['{"expr":"query #1"}'], ExploreId.left);
    await assertQueryHistory(['{"expr":"query #1"}'], ExploreId.right);
  });
});
