import axios from "axios";

export const detectSign = async (image) => {
  const res = await axios.post("http://localhost:5000/api/detect-sign", {
    image
  });
  return res.data.prediction;
};