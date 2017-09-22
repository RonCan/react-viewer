import React from 'react';
import ViewerScreen from '../../../../lib/index';
import Loading from '../loadings/Loading';


const ViewerDummyBody = props => (
  <ViewerScreen fontDomain="resources/fonts/">
    <Loading />
  </ViewerScreen>
);

export default ViewerDummyBody;