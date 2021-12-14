import {model, Schema, Model, Document } from 'mongoose';
import { EModels } from './enumModels';

// интерфейс service
export interface IService {
  name: string
  type: Schema.Types.ObjectId
  prices: Array<Schema.Types.ObjectId>
  images: Array<string>
  executors: Array<Schema.Types.ObjectId>
}


// расширенный тип
interface ServiceType extends IService, Document{

}

// интерфейс модели 
interface ServiceModel extends Model<ServiceType>{

}

// схема
const NewSchema = new Schema<ServiceType, ServiceModel, ServiceType>({
  name: { type: String, required: true, unique: true },
  type: { type: Schema.Types.ObjectId, required: true, ref: EModels.typeServices },
  prices: [ { type: Schema.Types.ObjectId, ref: EModels.prices } ],
  images: [ { type: String } ],
  executors: [ { type: Schema.Types.ObjectId } ]
})

// экспорт самой модели
export const Services: ServiceModel = <ServiceModel>model(EModels.services, NewSchema)