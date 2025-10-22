// src/utils/storageUtils.js
export const loadStoredBranches = () => {
  try {
    const s = localStorage.getItem("pcinv_branch_map");
    return s ? JSON.parse(s) : {};
  } catch (e) {
    return {};
  }
};

export const saveStoredBranches = (obj) => {
  try {
    localStorage.setItem("pcinv_branch_map", JSON.stringify(obj || {}));
  } catch (e) {
    // ignore
  }
};