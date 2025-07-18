export const getImageUrl = (imagePath: string) => {
  return `${`https://storage.googleapis.com/left_seat_lessons`}${imagePath}`;
};

export const baseUrl = process.env.APP_URL;

