import {model, Schema, Model, Document } from 'mongoose';
import { EModels } from './enumModels';

// интерфейс price
export interface IPrice {
  currency: string
  cost: number
}


// расширенный тип
interface PriceType extends IPrice, Document{

}

// интерфейс модели 
interface PriceModel extends Model<PriceType>{

}

// виды валют
enum Currency {
  USD = "USD",
  RUB = "RUB"
}

// схема
const NewSchema = new Schema<PriceType, PriceModel, PriceType>({
  currency: { type: String, required: true, enum: Currency },
  cost: { type: Number, required: true }
})

// экспорт самой модели
export const Prices: PriceModel = <PriceModel>model(EModels.prices, NewSchema)