import { CredentialRequest } from "google-auth-library";
import ClientError from "../models/client-error";
import CredentialsModel from "../models/credentials-model";
import { IUserModel, UserModel } from "../models/user-model";
import { comparePassword, encryptPassword } from "../utils/bcrypt-utils";
import jwt from "../utils/jwt";
import google from "../utils/google";
import { googleClient } from "../dal/google";
import { ErrorMessages } from "../utils/helpers";

class AuthenticationLogic {
  signup = async (user: IUserModel): Promise<string> => {
    const newEncryptedPassword: String = await encryptPassword(user.services.password);
    const userToSave = new UserModel({
      ...user,
      services: {
        password: newEncryptedPassword
      }
    });

    const errors = userToSave.validateSync();
    if (errors) {
      throw new ClientError(500, errors.message);
    }
    const savedUser = await userToSave.save();
    const token = jwt.getNewToken(savedUser.toObject());
    return token;
  };

  signin = async (credentials: CredentialsModel): Promise<string> => {
    const user: IUserModel = await UserModel.findOne({
      'emails.email': credentials.email
    }).exec();

    if (!user) throw new ClientError(500, "Email or password are incorrect");
    if (user) {
      const passwordMatch = await comparePassword(credentials.password, user.services.password);
      if (passwordMatch) {
        const loggedUser = user.toObject();
        const { services, ...restOfUser } = loggedUser;
        const token = jwt.getNewToken(restOfUser);
        return token;
      } else {
        throw new ClientError(500, "Email or password are incorrect");
      }
    }
  };

  google = async (credential: string, clientId: string): Promise<string> => {
    const loginTicket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
    const email = loginTicket.getPayload().email;

    if (!email) {
      throw new ClientError(400 ,'Some error while trying to get the user email')
    }

    const isSigned = await UserModel.exists({ 'emails.email': email }).exec();
    let user: IUserModel = null;

    if (isSigned) {
      user = await UserModel.findOne({ 'emails.email': email }).select('-services').exec();
    } else {
      const payload = loginTicket.getPayload();
      user = await google.createUserForGoogleAccounts(payload);
    }
    if (!user) {
      throw new ClientError(500, ErrorMessages.SOME_ERROR);
    }

    const userWithoutServices = this.removeServicesFromUser(user);
    const token = jwt.getNewToken(userWithoutServices);
    return token;
  };
  private removeServicesFromUser = (user: IUserModel): IUserModel => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { services, ...rest } = user.toObject();
    return rest;
  }
};

const authLogic = new AuthenticationLogic();
export default authLogic;