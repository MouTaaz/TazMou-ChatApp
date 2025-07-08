export const formatDate = (dateString) => {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};
export const formatTime = (dateString) => {
  const options = { hour: "2-digit", minute: "2-digit" };
  return new Date(dateString).toLocaleTimeString("en-US", options);
};
export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  const dateOptions = { year: "numeric", month: "long", day: "numeric" };
  const timeOptions = { hour: "2-digit", minute: "2-digit" };
  return {
    date: date.toLocaleDateString("en-US", dateOptions),
    time: date.toLocaleTimeString("en-US", timeOptions),
  };
};
