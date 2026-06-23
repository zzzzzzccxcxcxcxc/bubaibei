function createWxStorage(wxApi) {
  return {
    get(key, fallback = null) {
      return new Promise((resolve, reject) => {
        wxApi.getStorage({
          key,
          success: ({ data }) => resolve(data),
          fail: (error) => {
            if (error?.errMsg?.includes('data not found')) {
              resolve(fallback);
              return;
            }
            reject(error);
          },
        });
      });
    },

    set(key, data) {
      return new Promise((resolve, reject) => {
        wxApi.setStorage({
          key,
          data,
          success: resolve,
          fail: reject,
        });
      });
    },

    remove(key) {
      return new Promise((resolve, reject) => {
        wxApi.removeStorage({
          key,
          success: resolve,
          fail: reject,
        });
      });
    },
  };
}

module.exports = { createWxStorage };
