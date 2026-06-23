const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event = {}) => {
  const database = cloud.database();
  const result = await database
    .collection('public_config')
    .doc('library_manifest')
    .get();
  const libraries = result.data?.libraries || [];
  if (!event.libraryId) return { libraries };
  return {
    library: libraries.find((item) => item.libraryId === event.libraryId) || null,
  };
};
