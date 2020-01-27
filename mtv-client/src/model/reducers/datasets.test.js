import datasetsReducer from './datasets';
import { datasets } from '../../tests/testmocks/datasets';

describe('Testing dataset reducer', () => {
  it('should handle GET_DATASET_REQUEST', () => {
    expect(
      datasetsReducer(undefined, {
        type: 'GET_DATASETS_REQUEST',
      }),
    ).toEqual({
      isDatasetLoading: true,
      dataSetsList: [],
    });
  });

  it('Should handle GET_DATASETS_SUCCESS', () => {
    const successAction = {
      type: 'GET_DATASETS_SUCCESS',
      result: { datasets },
    };
    expect(datasetsReducer(undefined, successAction)).toEqual({
      isDatasetLoading: false,
      dataSetsList: datasets,
    });
  });

  it('Should handle GET_DATASETS_FAILURE', () => {
    const errAction = {
      type: 'GET_DATASETS_FAILURE',
      datasets,
    };

    expect(datasetsReducer(undefined, errAction)).toEqual({
      isDatasetLoading: false,
      dataSetsList: [],
    });
  });
});
