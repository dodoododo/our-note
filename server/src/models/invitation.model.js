const mongoose = require('mongoose');

const invitationSchema = mongoose.Schema(
  {
    group_id: { type: mongoose.SchemaTypes.ObjectId, ref: 'Group', required: true },
    group_name: { type: String, required: true, trim: true },
    
    // Inviter (The person sending)
    inviter_email: { type: String, required: true, lowercase: true, trim: true },
    inviter_name: { type: String, required: true, trim: true },
    
    // Invitee (The person receiving)
    invitee_email: { type: String, required: true, lowercase: true, trim: true },
    
    // Status
    status: { 
      type: String, 
      enum: ['pending', 'accepted', 'declined', 'expired'], 
      default: 'pending' 
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Optional: Prevent duplicate pending invitations for the same user and group
invitationSchema.index({ group_id: 1, invitee_email: 1, status: 1 });

const Invitation = mongoose.model('Invitation', invitationSchema);
module.exports = Invitation;