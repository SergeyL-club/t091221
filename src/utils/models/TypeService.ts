import {model, Schema, Model, Document } from 'mongoose';
import { EModels } from './enumModels';

// интерфейс type service
export interface ITypeService {
  name: string
}


// расширенный тип
interface TTService extends ITypeService, Document{

}

// интерфейс модели 
interface ServiceModel extends Model<TTService>{

}

// схема
const NewSchema = new Schema<TTService, ServiceModel, TTService>({
  name: { type: String, required: true, unique: true }
})

// экспорт самой модели
export const typeServices: ServiceModel = <ServiceModel>model(EModels.typeServices, NewSchema)