export class VietQR {
  constructor() {
    this.payloadFormatIndicator = "000201";
    this.pointOfInitiationMethod = "010212";
    this.consumerAccountInformation = "";
    this.guid = "0010A000000727";
    this.transactionCurrency = "5303704";
    this.transactionAmount = "";
    this.countryCode = "5802VN";
    this.additionalDataFieldTemplate = "";
  }

  convertLength(num) {
    return num < 10 ? `0${num}` : `${num}`;
  }

  setTransactionAmount(money) {
    const str = String(money);
    this.transactionAmount = `54${this.convertLength(str.length)}${str}`;
    return this;
  }

  setBeneficiaryOrganization(acquierID, consumerID) {
    const acquier = `00${this.convertLength(acquierID.length)}${acquierID}`;
    const consumer = `01${this.convertLength(consumerID.length)}${consumerID}`;
    const benLen = this.convertLength(`${acquier}${consumer}`.length);
    const totalLen = this.convertLength(Number(benLen) + 30);
    this.consumerAccountInformation = `38${totalLen}${this.guid}01${benLen}${acquier}${consumer}0208QRIBFTTA`;
    return this;
  }

  setAdditionalDataFieldTemplate(content) {
    const clean = content.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 25);
    const cLen = this.convertLength(clean.length);
    const totalLen = this.convertLength(clean.length + 4);
    this.additionalDataFieldTemplate = `62${totalLen}08${cLen}${clean}`;
    return this;
  }

  calcCRC(str) {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      }
    }
    return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
  }

  build() {
    const contentQR = `${this.payloadFormatIndicator}${this.pointOfInitiationMethod}${this.consumerAccountInformation}${this.transactionCurrency}${this.transactionAmount}${this.countryCode}${this.additionalDataFieldTemplate}6304`;
    return `${contentQR}${this.calcCRC(contentQR)}`;
  }
}
