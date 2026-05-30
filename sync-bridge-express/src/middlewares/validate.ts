import { celebrate, Joi, Segments } from 'celebrate';

export const validate = (schema: Joi.ObjectSchema) => {
  return celebrate({
    [Segments.BODY]: schema,
  });
};
