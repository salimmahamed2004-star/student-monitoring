import os
import json
import keras
from keras import layers, models

print("Starting CNN model building...")
saved_dir = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(saved_dir, 'feature_schema.json')) as f:
    schema = json.load(f)

n_timesteps = schema['n_timesteps'] # 39
n_dyn_features = len(schema['dynamic_features_order']) # 5
n_static_features = 4 # studied_credits, num_prev_attempts, highest_ed, age_band

dyn_in = layers.Input(shape=(n_timesteps, n_dyn_features), name='dynamic_input')
c = layers.Masking(mask_value=0.0)(dyn_in)
c = layers.Conv1D(64, kernel_size=3, activation='relu', padding='same')(c)
c = layers.Conv1D(32, kernel_size=3, activation='relu', padding='same')(c)
c = layers.GlobalMaxPooling1D()(c)
c = layers.Dropout(0.3)(c)

stat_in = layers.Input(shape=(n_static_features,), name='static_input')
s = layers.Dense(16, activation='relu')(stat_in)

merged = layers.Concatenate()([c, s])
merged = layers.Dense(16, activation='relu')(merged)
merged = layers.Dropout(0.3)(merged)
cnn_out = layers.Dense(1, activation='sigmoid', name='risk_score')(merged)

cnn = models.Model(inputs=[dyn_in, stat_in], outputs=cnn_out)
cnn.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy', 'auc'])

cnn.save(os.path.join(saved_dir, 'cnn_risk_model.keras'))
print("Successfully created and saved cnn_risk_model.keras!")
